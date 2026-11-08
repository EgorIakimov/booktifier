"""Inspect and edit copies of EPUB packages without converting their contents."""
from copy import copy
import base64
import io
import posixpath
import re
import uuid
import zipfile
from datetime import datetime, timezone
from urllib.parse import unquote
from xml.dom import minidom
from xml.sax.saxutils import escape
from PIL import Image, ImageOps

OPF = "http://www.idpf.org/2007/opf"
DC = "http://purl.org/dc/elements/1.1/"

def children(node, name):
    return [n for n in node.childNodes if n.localName == name]

def value(node):
    return "".join(n.data for n in node.childNodes if n.nodeType in (3, 4)).strip()

def parse(data):
    if b"<!ENTITY" in data.upper():
        raise ValueError("Неподдерживаемый XML")
    return minidom.parseString(data)

def picture(data, fmt="JPEG"):
    with Image.open(io.BytesIO(data)) as src:
        if src.width * src.height > 16_000_000:
            raise ValueError("Изображение слишком большое")
        src = ImageOps.exif_transpose(src).convert("RGBA")
        src.thumbnail((2000, 3000))
        out = Image.new("RGB", src.size, "white")
        out.paste(src, mask=src.getchannel("A"))
        stream = io.BytesIO()
        out.save(stream, format=fmt, quality=92)
        return stream.getvalue()

class Book:
    def __init__(self, data):
        self.archive = zipfile.ZipFile(io.BytesIO(data))
        files = self.archive.infolist()
        if len(files) > 20000 or sum(f.file_size for f in files) > 128_000_000:
            raise ValueError("EPUB слишком большой")
        container = parse(self.archive.read("META-INF/container.xml"))
        self.path = container.getElementsByTagNameNS("*", "rootfile")[0].getAttribute("full-path")
        self.doc = parse(self.archive.read(self.path))
        self.root = self.doc.documentElement
        self.meta = children(self.root, "metadata")[0]
        self.manifest = children(self.root, "manifest")[0]
        self.spine = children(self.root, "spine")[0]
        self.items = children(self.manifest, "item")
        refs = [n.getAttribute("content") for n in children(self.meta,"meta") if n.getAttribute("name") == "cover"]
        self.cover = next((i for i in self.items if "cover-image" in i.getAttribute("properties").split()
                           or (i.getAttribute("id") in refs and i.getAttribute("media-type").startswith("image/"))), None)
        guides = children(self.root, "guide")
        self.ref = next((r for g in guides for r in children(g, "reference") if r.getAttribute("type") == "cover"), None)
        if self.cover is None and self.ref:
            target = self.resolve(self.ref.getAttribute("href"))
            if target in self.archive.namelist() and target.lower().endswith((".html",".xhtml")):
                page = parse(self.archive.read(target))
                images = [n for n in page.getElementsByTagName("*") if n.localName in ("image", "img")]
                if images:
                    img = images[0]
                    target = self.resolve(img.getAttribute("src") or img.getAttribute("xlink:href") or img.getAttribute("href"), target)
            self.cover = next((i for i in self.items if self.resolve(i.getAttribute("href")) == target and i.getAttribute("media-type").startswith("image/")), None)

    def resolve(self, href, parent=None):
        return posixpath.normpath(posixpath.join(posixpath.dirname(parent or self.path), unquote(href.split("#")[0])))

    def metadata(self):
        ids = " ".join(value(n) for n in children(self.meta, "identifier") if "uuid" not in value(n).lower())
        compact = re.sub(r"[-\s]", "", ids)
        cover = None
        if self.cover:
            data = self.archive.read(self.resolve(self.cover.getAttribute("href")))
            mime = self.cover.getAttribute("media-type")
            cover = "data:" + mime + ";base64," + base64.b64encode(data).decode()
        return dict(language=next((value(n) for n in children(self.meta,"language")), ""),
                    title=next((value(t) for t in children(self.meta,"title")), ""),
                    authors=[value(n) for n in children(self.meta,"creator")],
                    isbns=re.findall(r"(?<!\d)(?:97[89]\d{10}|\d{9}[\dX])(?!\d)", compact), cover=cover)

    def element(self, parent, tag, **attrs):
        prefix = self.root.prefix
        node = self.doc.createElementNS(OPF, (prefix + ":" if prefix else "") + tag)
        parent.appendChild(node)
        for k,v in attrs.items():
            node.setAttribute(k,v)
        return node

    def fields(self, name, values):
        nodes = children(self.meta, name)
        for i, val in enumerate(values):
            if i < len(nodes):
                node = nodes[i]
                if value(node) == val:
                    continue
                if node.hasAttributeNS(OPF,"file-as"):
                    node.removeAttributeNS(OPF,"file-as")
            else:
                node = self.doc.createElementNS(DC,"dc:" + name)
                node.setAttribute("xmlns:dc", DC)
                self.meta.appendChild(node)
            while node.firstChild:
                node.removeChild(node.firstChild)
            node.appendChild(self.doc.createTextNode(val))
        for n in nodes[len(values):]:
            ident = n.getAttribute("id")
            if ident:
                for meta in children(self.meta, "meta"):
                    if meta.getAttribute("refines") == "#" + ident:
                        self.meta.removeChild(meta)
            self.meta.removeChild(n)

    def resize_cover_page(self, edits, image_path, width, height):
        # Some EPUB 2 files wrap the cover in an SVG sized for the original jacket.
        first_refs = children(self.spine, "itemref")[:1]
        ids = {r.getAttribute("idref") for r in first_refs}
        paths = {self.resolve(i.getAttribute("href")) for i in self.items
                 if i.getAttribute("id") in ids and i.getAttribute("media-type") == "application/xhtml+xml"}
        if self.ref:
            guide_path = self.resolve(self.ref.getAttribute("href"))
            if guide_path.lower().endswith((".xhtml", ".html")):
                paths.add(guide_path)
        for path in paths:
            if path not in self.archive.namelist():
                continue
            page = parse(self.archive.read(path))
            for svg in page.getElementsByTagNameNS("http://www.w3.org/2000/svg", "svg"):
                elements = [n for n in svg.childNodes if n.nodeType == n.ELEMENT_NODE]
                if len(elements) != 1 or elements[0].localName != "image":
                    continue
                img = elements[0]
                href = img.getAttributeNS("http://www.w3.org/1999/xlink", "href") or img.getAttribute("href")
                if self.resolve(href, path) != image_path:
                    continue
                svg.setAttribute("viewBox", f"0 0 {width} {height}")
                for attr, size in (("width", width), ("height", height)):
                    img.setAttribute(attr, str(size))
                    if svg.getAttribute(attr).removesuffix("px").isdigit():
                        svg.setAttribute(attr, str(size))
                edits[path] = page.toxml(encoding="UTF-8")

    def export(self, title, authors, image=None):
        other_titles = [value(n) for n in children(self.meta, "title")[1:]]
        self.fields("title", [title, *other_titles])
        self.fields("creator", authors)
        edits = {}
        v3 = self.root.getAttribute("version").startswith("3")
        if image:
            if self.cover:
                path = self.resolve(self.cover.getAttribute("href"))
                fmt = {"image/jpeg":"JPEG","image/png":"PNG","image/gif":"GIF","image/webp":"WEBP"}.get(self.cover.getAttribute("media-type"))
                if fmt:
                    edits[path] = picture(image, fmt)
                    with Image.open(io.BytesIO(edits[path])) as replacement:
                        self.resize_cover_page(edits, path, *replacement.size)
                elif self.cover.getAttribute("media-type") == "image/svg+xml":
                    uri = base64.b64encode(picture(image)).decode()
                    with Image.open(io.BytesIO(image)) as src:
                        w,h = src.size
                    edits[path] = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}"><image width="{w}" height="{h}" xlink:href="data:image/jpeg;base64,{uri}"/></svg>'.encode()
                else:
                    raise ValueError("Формат исходной обложки не поддерживается для замены")
            else:
                ident = "cover-" + uuid.uuid4().hex
                jpg, page = ident + ".jpg", ident + ".xhtml"
                item = self.element(self.manifest, "item", id=ident, href=jpg, **{"media-type":"image/jpeg"})
                self.element(self.manifest, "item", id=ident+"-page", href=page, **{"media-type":"application/xhtml+xml"})
                ref = self.element(self.spine,"itemref", idref=ident+"-page")
                self.spine.insertBefore(ref, self.spine.firstChild)
                if v3:
                    item.setAttribute("properties","cover-image")
                else:
                    self.element(self.meta,"meta",name="cover",content=ident)
                    guides = children(self.root,"guide")
                    guide = guides[0] if guides else self.element(self.root,"guide")
                    ref = self.ref or self.element(guide,"reference",type="cover",title="Обложка")
                    ref.setAttribute("href",page)
                edits[self.resolve(jpg)] = picture(image)
                edits[self.resolve(page)] = f'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>{escape(title)}</title></head><body style="margin:0;text-align:center"><img style="max-width:100%;max-height:100vh" src="{jpg}" alt="Обложка"/></body></html>'.encode()
        if v3:
            modified = next((n for n in children(self.meta,"meta") if n.getAttribute("property") == "dcterms:modified"),None)
            if modified:
                while modified.firstChild:
                    modified.removeChild(modified.firstChild)
                modified.appendChild(self.doc.createTextNode(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")))
        edits[self.path] = self.doc.toxml(encoding="UTF-8")
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as out:
            out.writestr("mimetype", b"application/epub+zip", zipfile.ZIP_STORED)
            for f in self.archive.infolist():
                if f.filename != "mimetype" and f.filename not in edits:
                    out.writestr(copy(f), self.archive.read(f))
            for path,data in edits.items():
                out.writestr(path,data)
        return buf.getvalue()
