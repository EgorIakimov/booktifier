<div align="center">
  <img alt="Booktifier logo" src="assets/logo.svg" width="100" />
</div>
<h1 align="center">Booktifier</h1>
<p align="center">
  A little workshop for beautiful EPUBs.<br />
  Edit book details, choose a cover, and send your book to Kindle.
</p>
<p align="center">
  <a href="https://booktifier.duckdns.org:8443/">Open Booktifier</a>
  ·
  <a href="RELEASE_NOTES.md">Release notes</a>
  ·
  <a href="https://github.com/EgorIakimov/booktifier/issues">Report a bug</a>
</p>

## What it does

- Reads titles, multiple authors, language, ISBNs, and existing covers from EPUB files.
- Offers seven cover designs with your book's title and author.
- Finds alternative covers in Open Library.
- Accepts your own JPG, PNG, or WebP cover, including drag-and-drop and clipboard paste.
- Exports an updated EPUB with a readable filename.
- Sends the prepared EPUB to Kindle using your personal Gmail app password.
- Detects English or Russian from the browser and remembers your language preference.
- Supports mobile and desktop layouts, Unicode metadata, and right-to-left cover lettering.

EPUB uploads can be up to **50 MB**. Gmail attachments can be up to **25 MB**, with an additional check against the SMTP server's encoded message limit. Larger books can be downloaded and uploaded through [Amazon Send to Kindle](https://www.amazon.com/sendtokindle).

## Running locally

Python 3.13 or newer is required.

```sh
git clone https://github.com/EgorIakimov/booktifier.git
cd booktifier
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r app/requirements.txt
python3 app/server.py
```

Open [127.0.0.1:8765](http://127.0.0.1:8765/).

For a preview on another device in your Wi-Fi network, run `python3 app/server.py --lan YOUR_WIFI_IP`. Use a trusted network, as this local preview uses HTTP.

## Docker deployment

The Compose project runs two services, Booktifier and Caddy. Caddy obtains and renews the HTTPS certificate using HTTP-01 on port 80.

```sh
docker compose up -d --build
docker compose ps
```

The included configuration serves [booktifier.duckdns.org:8443](https://booktifier.duckdns.org:8443/). To self-host on your own hostname, update both `Caddyfile` and `PUBLIC_ORIGIN` in `compose.yaml`. Point the hostname to your server and allow inbound TCP ports 80 and 8443. The server must also allow outbound Gmail SMTP on port 465.

```sh
docker compose logs --tail 50 caddy
docker compose stop
```

The app has a read-only filesystem, a 256 MB memory limit, and one processing request at a time. Caddy has a 64 MB memory limit. Expanded EPUB contents are limited to 128 MB, and uploaded cover images to 16 megapixels.

## Email setup and privacy

In Settings, enter your Kindle email, your personal Gmail address, and a 16-character [Google app password](https://myaccount.google.com/apppasswords). Add the Gmail sender to your approved email addresses in Amazon's Kindle settings.

Email addresses and the app password are stored in **localStorage in your browser**. The password is not encrypted separately by the app. It is sent to the server over HTTPS when you send a book and is used in memory to authenticate with Gmail. Books are processed in memory. The backend does not persist books or email credentials, and request/access logging is disabled. Caddy persists its TLS certificates and configuration.

Cover searches send the book's title, author, language preference, and available ISBNs to Open Library. Thumbnails are cached temporarily in server memory. Cover selection remains manual.

The hosted app has no user accounts. Each browser has its own settings. Use a trusted device and a trusted deployment.

## Project structure

```text
app/
  server.py          HTTP API, Open Library search, and Gmail delivery
  epub.py            EPUB inspection and metadata/cover updates
  requirements.txt   Pillow and certifi
  static/            Browser UI, translations, and cover designs
assets/              Repository branding
compose.yaml         Booktifier and Caddy services
Caddyfile            HTTPS and reverse proxy
Dockerfile           Python application image
```

## Forking this repo

You are welcome to use Booktifier as a starting point. A link back to this repository or [egoriakimov.com](https://egoriakimov.com) is appreciated. Review [NOTICE](NOTICE) for artwork attribution and licensing scope.

## Release Notes

See [RELEASE_NOTES](RELEASE_NOTES.md).

## Authors

- Egor Iakimov - [EgorIakimov](https://github.com/EgorIakimov)

## Code of Conduct

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Contributing

See [Contributing](CONTRIBUTING.md) for bug reports and pull requests.

## License

Source code and documentation are licensed under Apache License 2.0. See [LICENSE](LICENSE.md) and [NOTICE](NOTICE).
