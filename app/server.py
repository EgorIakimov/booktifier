"""Local Booktifier server. Run with python3 server.py."""
import argparse
import base64
from ipaddress import IPv4Address
import json
import os
import re
import smtplib
import ssl
import threading
import time
from email.message import EmailMessage
from email.policy import SMTP
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import certifi

from epub import Book, picture

HOST, PORT = "127.0.0.1", 8765
STATIC = Path(__file__).parent / "static"
LIMIT = 100_000_000
PUBLIC_ORIGIN = os.environ.get("PUBLIC_ORIGIN", "")
operation_lock = threading.BoundedSemaphore(1)
catalog_lock = threading.Lock()
last_request = 0.0

def fetch(url, limit):
    request = Request(url, headers={"User-Agent":"Booktifier/1.0 (personal local EPUB editor)"})
    with urlopen(request, timeout=18, context=ssl.create_default_context(cafile=certifi.where())) as response:
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Ответ каталога слишком велик")
        return data

@lru_cache(maxsize=16)
def cover_thumbnail(cover_id):
    return fetch(f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg?default=false", 1_500_000)


def catalog_request(path, params):
    global last_request
    with catalog_lock:
        time.sleep(max(0, 1.1 - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        data = fetch("https://openlibrary.org" + path + "?" + urlencode(params), 2_000_000)
    return json.loads(data)

def covers(title, authors, isbns, language=""):
    language = language.lower().split("-")[0]
    preference = {"lang":language} if re.fullmatch(r"[a-z]{2}", language) else {}
    found = {}
    works = []
    def add(cid, name, details=""):
        if isinstance(cid, int) and cid > 0:
            found.setdefault(cid, dict(id=cid, title=name or title, info=details))
    def collect(query):
        docs = catalog_request("/search.json", {**query, "fields":"key,title,cover_i,editions,editions.cover_i,editions.title", **preference, "limit":5})["docs"]
        for work in docs:
            works.append(work["key"])
            for edition in work.get("editions", {}).get("docs", []):
                add(edition.get("cover_i"), edition.get("title"))
            add(work.get("cover_i"), work.get("title"))
    if isbns:
        collect({"q":" OR ".join("isbn:"+n for n in isbns)})
    try:
        surname = authors.split("\n")[0].split()
        collect({"title":title, "author":surname[-1] if surname else ""})
        if works and len(found) < 10 and re.fullmatch(r"/works/OL[0-9]+W", works[0]):
            editions = catalog_request(works[0]+"/editions.json", {"limit":100}).get("entries", [])
            def languages(edition):
                return [lang["key"].split("/")[-1] for lang in edition.get("languages", []) if "key" in lang]
            for edition in editions:
                details = " · ".join(filter(None, [*languages(edition)[:1], edition.get("publish_date")]))
                for cid in edition.get("covers", []):
                    add(cid, edition.get("title"), details)
    except (HTTPError, URLError, TimeoutError):
        if not found:
            raise
    return list(found.values())[:10]

def mail_message(data, epub):
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = data["sender"], data["kindle"], data["title"]
    msg.set_content("Книга во вложении.")
    msg.add_attachment(epub,maintype="application",subtype="epub+zip",filename=data["filename"])
    return msg

def send(data):
    smtp = data["smtp"]
    if not re.fullmatch(r"[^@\s<>]+@gmail\.com", smtp["sender"].strip(), re.I):
        raise ValueError("Для отправки укажите личный адрес @gmail.com")
    secret = "".join(smtp.get("secret", "").split())
    if not re.fullmatch(r"[a-zA-Z0-9]{16}", secret):
        raise ValueError("Введите 16 символов пароля приложения Google")
    raw = base64.b64decode(data.pop("epub"),validate=True)
    if len(raw) > 25_000_000:
        raise ValueError("Для Gmail книга должна быть не больше 25 МБ. Скачайте EPUB и загрузите через Send to Kindle.")
    msg = mail_message({**smtp,"title":data["title"],"filename":data["filename"]}, raw)
    context = ssl.create_default_context(cafile=certifi.where())
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=25, context=context) as client:
        client.ehlo()
        wire_message = msg.as_bytes(policy=SMTP)
        advertised_limit = client.esmtp_features.get("size", "")
        if advertised_limit.isdigit() and len(wire_message) > int(advertised_limit):
            raise ValueError("Письмо превышает лимит Gmail с учётом кодирования вложения. Скачайте EPUB и загрузите через Send to Kindle.")
        client.login(smtp["sender"], secret)
        client.sendmail(smtp["sender"], smtp["kindle"], wire_message)

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(90)

    def log_message(self,*args):
        pass

    def reply(self,data,mime="application/json",status=200):
        if mime == "application/json":
            data = json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type",mime)
        self.send_header("Content-Length",str(len(data)))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Security-Policy","default-src 'self'; img-src 'self' data: blob: https://covers.openlibrary.org https://*.archive.org; style-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(data)

    @property
    def authority(self):
        host, port = self.server.server_address
        return urlsplit(PUBLIC_ORIGIN).netloc if PUBLIC_ORIGIN else f"{host}:{port}"

    def do_GET(self):
        if self.headers.get("Host") != self.authority:
            return self.reply({},status=403)
        thumbnail = re.fullmatch(r"/covers/([1-9][0-9]{0,9})-M.jpg", self.path)
        if thumbnail:
            try:
                data = cover_thumbnail(int(thumbnail.group(1)))
            except (OSError, ValueError):
                return self.reply({}, status=502)
            return self.reply(data, "image/jpeg")
        routes = {"/i18n.js":("i18n.js","text/javascript"),"/doodles.jpg":("doodles.jpg","image/jpeg"),"/":("index.html","text/html; charset=utf-8"),"/style.css":("style.css","text/css"),"/app.js":("app.js","text/javascript"),"/templates.js":("templates.js","text/javascript")}
        route = routes.get(urlsplit(self.path).path)
        if route:
            return self.reply((STATIC/route[0]).read_bytes(),route[1])
        self.reply({},status=404)

    def do_POST(self):
        if not operation_lock.acquire(blocking=False):
            return self.reply({"error":"Сервис занят. Повторите через несколько секунд."}, status=429)
        try:
            self.handle_post()
        finally:
            operation_lock.release()

    def handle_post(self):
        if self.headers.get("Host") != self.authority or self.headers.get("Origin") != (PUBLIC_ORIGIN or "http://" + self.authority):
            return self.reply({},status=403)
        try:
            size = int(self.headers.get("Content-Length","0"))
            if not 0 < size <= LIMIT:
                return self.reply({"error":"Файл слишком большой или пуст"},status=413)
            body = self.rfile.read(size)
            if self.path == "/inspect":
                return self.reply(Book(body).metadata())
            d = json.loads(body.decode("ascii") if len(body) > 1_000_000 else body)
            del body
            if self.path == "/export":
                title = d["title"].strip()
                if not title:
                    raise ValueError("Введите название")
                book = Book(base64.b64decode(d.pop("epub"),validate=True))
                img = base64.b64decode(d["image"],validate=True) if d.get("image") else None
                return self.reply(book.export(title,d["authors"],img),"application/epub+zip")
            if self.path == "/search":
                return self.reply(covers(d["title"],d["authors"],tuple(n for n in d["isbns"] if re.fullmatch(r"\d{9}[\dX]|\d{13}",n)), d.get("language", "")))
            if self.path == "/image":
                cid = int(d["id"])
                data = picture(fetch(f"https://covers.openlibrary.org/b/id/{cid}-L.jpg?default=false",8_000_000))
                return self.reply(data,"image/jpeg")
            if self.path == "/send":
                send(d)
                return self.reply({})
            return self.reply({},status=404)
        except (URLError,HTTPError,TimeoutError,ConnectionError) as e:
            msg = "Сервис недоступен. Повторите позже."
            if self.path == "/send":
                msg = "Связь с почтой прервана. Проверьте доставку перед повторной отправкой."
            self.reply({"error":msg},status=502)
        except smtplib.SMTPException as e:
            self.reply({"error":"Ошибка SMTP. Проверьте настройки почты и допустимый размер вложения."},status=400)
        except Exception as e:
            self.reply({"error":str(e) if isinstance(e,ValueError) else "Не удалось обработать данные. Проверьте файл и настройки."},status=400)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lan", type=IPv4Address, metavar="WIFI_IP", help="Адрес Wi-Fi для предпросмотра")
    args = parser.parse_args()
    if args.lan and (not args.lan.is_private or args.lan.is_unspecified or args.lan.is_loopback):
        parser.error("Укажите локальный IPv4-адрес Wi-Fi")
    host = os.environ.get("BIND_HOST") or (str(args.lan) if args.lan else HOST)
    with ThreadingHTTPServer((host, PORT), Handler) as server:
        print(f"Booktifier · http://{host}:{PORT}", flush=True)
        server.serve_forever()
