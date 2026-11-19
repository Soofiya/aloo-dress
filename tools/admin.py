#!/usr/bin/env python3
"""
admin.py — your private control panel for Aloo All Day.

    python3 tools/admin.py          (or double-click "Open Admin.command")

It opens a page in your browser where you can:
  - drag in new clothes (PNG) and pick the category and name
  - reorder, rename, move or delete items in the carousel
  - preview the game
  - collect everything that changed into a "to-upload" folder, ready to drag
    onto GitHub

WHY IT IS PRIVATE
  The panel runs only on YOUR computer (address 127.0.0.1), not on the internet,
  and every request needs a secret key that is made fresh each time you start it.
  Nobody else can reach it. Close the Terminal window (or press Ctrl+C) to stop it.

Needs Pillow once:   python3 -m pip install pillow
"""
import io
import json
import mimetypes
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_assets as ba          # reuse thumbnail + naming code

SITE = os.path.abspath(os.path.join(HERE, ".."))
ASSETS = os.path.join(SITE, "assets")
CONFIG = os.path.join(SITE, "js", "config.js")
TO_UPLOAD = os.path.join(SITE, "to-upload")
DELETE_LIST = os.path.join(TO_UPLOAD, "_DELETE-THESE-ON-GITHUB.txt")
MARKER = "// ▲▲ NEW ITEMS ARE ADDED ABOVE THIS LINE"
KEY = secrets.token_urlsafe(16)
PORT = 8800
LOCK = threading.Lock()

mimetypes.add_type("font/otf", ".otf")
mimetypes.add_type("application/manifest+json", ".webmanifest")


# ---------------------------------------------------------------------------
# config.js reading and writing
# ---------------------------------------------------------------------------
ITEM_RE = re.compile(r"\{\s*id:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'\s*,\s*name:\s*'((?:[^'\\]|\\.)*)'\s*\}")

def read_config():
    return open(CONFIG, encoding="utf-8").read()

def get_items(text):
    start = text.index("const ITEMS = [")
    end = text.index(MARKER)
    return [{"id": m.group(1), "category": m.group(2),
             "name": m.group(3).replace("\\'", "'").replace("\\\\", "\\")}
            for m in ITEM_RE.finditer(text[start:end])]

def get_categories(text):
    return [{"id": m.group(1), "label": m.group(2), "rule": m.group(3)}
            for m in re.finditer(r"^\s{2}(\w+):\s*\{\s*label:\s*'([^']*)',\s*rule:\s*'(\w+)'", text, re.M)]

def set_items(text, items):
    start = text.index("const ITEMS = [")
    start = text.index("\n", start) + 1
    end = text.index("  " + MARKER)
    def esc(s): return s.replace("\\", "\\\\").replace("'", "\\'")
    lines = "".join("  { id: '%s', category: '%s', name: '%s' },\n" % (i["id"], i["category"], esc(i["name"]))
                    for i in items)
    return text[:start] + lines + "\n" + text[end:]

def save_items(items):
    text = set_items(read_config(), items)
    open(CONFIG, "w", encoding="utf-8").write(text)
    stage("js/config.js")


# ---------------------------------------------------------------------------
# The "to-upload" folder: a copy of everything that changed
# ---------------------------------------------------------------------------
def read_delete_list():
    if not os.path.exists(DELETE_LIST):
        return []
    return [l.strip() for l in open(DELETE_LIST, encoding="utf-8") if l.strip() and not l.startswith("#")]

def write_delete_list(paths):
    os.makedirs(TO_UPLOAD, exist_ok=True)
    if not paths:
        if os.path.exists(DELETE_LIST): os.remove(DELETE_LIST)
        return
    with open(DELETE_LIST, "w", encoding="utf-8") as f:
        f.write("# On GitHub, open each of these files and delete it (the ... menu, then Delete file).\n")
        f.write("\n".join(paths) + "\n")

def stage(rel):
    """Copy a changed file into to-upload/ (same folder structure as the site)."""
    dst = os.path.join(TO_UPLOAD, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(SITE, rel), dst)
    dl = read_delete_list()
    if rel in dl:
        write_delete_list([p for p in dl if p != rel])

def remove_file(rel):
    """Delete a file from the site and remember to delete it on GitHub too."""
    p = os.path.join(SITE, rel)
    if os.path.exists(p): os.remove(p)
    staged = os.path.join(TO_UPLOAD, rel)
    if os.path.exists(staged): os.remove(staged)
    dl = read_delete_list()
    if rel not in dl:
        write_delete_list(dl + [rel])

def pending():
    ups = []
    if os.path.isdir(TO_UPLOAD):
        for folder, _, files in os.walk(TO_UPLOAD):
            for f in files:
                if f.startswith(".") or f == os.path.basename(DELETE_LIST):
                    continue
                ups.append(os.path.relpath(os.path.join(folder, f), TO_UPLOAD).replace(os.sep, "/"))
    return {"upload": sorted(ups), "delete": read_delete_list()}


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------
def canvas_size():
    return Image.open(os.path.join(ASSETS, "aloo.png")).size

def layer_rel(cat, item_id): return f"assets/layers/{cat}/{item_id}.png"
def thumb_rel(cat, item_id): return f"assets/thumbs/{cat}/{item_id}.png"

def clean_id(filename):
    base = os.path.splitext(os.path.basename(filename))[0].lower().replace(" ", "-")
    return re.sub(r"[^a-z0-9_-]", "", base)

def action_upload(data, filename, category, name):
    text = read_config()
    cats = {c["id"] for c in get_categories(text)}
    if category not in cats:
        raise ValueError("Unknown category '%s'." % category)
    item_id = clean_id(filename)
    if not item_id:
        raise ValueError("Couldn't make a name from that file name.")
    try:
        img = Image.open(io.BytesIO(data)); img.load()
    except Exception:
        raise ValueError("That isn't a PNG image.")
    if img.format != "PNG":
        raise ValueError("Please use a PNG (this is a %s)." % img.format)
    w, h = canvas_size()
    if img.size != (w, h):
        raise ValueError("It is %d × %d px but must be %d × %d px (same canvas as aloo.png)."
                         % (img.size[0], img.size[1], w, h))
    items = get_items(text)
    existing = next((i for i in items if i["id"] == item_id), None)
    if existing and existing["category"] != category:
        raise ValueError("'%s' already exists in %s. Rename the file or move that item first."
                         % (item_id, existing["category"]))
    rel = layer_rel(category, item_id)
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    trel = thumb_rel(category, item_id)
    ba.make_thumb(path, os.path.join(SITE, trel))
    if not existing:
        items.append({"id": item_id, "category": category, "name": (name or ba.nice_name(item_id)).strip()})
    stage(rel); stage(trel)
    save_items(items)
    return {"id": item_id, "replaced": bool(existing), "kb": round(len(data) / 1024)}

def action_update(body):
    text = read_config()
    items = get_items(text)
    idx = next((n for n, i in enumerate(items) if i["id"] == body.get("id")), None)
    if idx is None:
        raise ValueError("Item not found.")
    item = items[idx]
    if body.get("delete"):
        remove_file(layer_rel(item["category"], item["id"]))
        remove_file(thumb_rel(item["category"], item["id"]))
        items.pop(idx)
    elif "name" in body:
        item["name"] = str(body["name"]).strip() or item["name"]
    elif "category" in body and body["category"] != item["category"]:
        new = body["category"]
        if new not in {c["id"] for c in get_categories(text)}:
            raise ValueError("Unknown category.")
        for kind, relf in (("layer", layer_rel), ("thumb", thumb_rel)):
            old_rel, new_rel = relf(item["category"], item["id"]), relf(new, item["id"])
            os.makedirs(os.path.dirname(os.path.join(SITE, new_rel)), exist_ok=True)
            shutil.move(os.path.join(SITE, old_rel), os.path.join(SITE, new_rel))
            remove_file(old_rel)            # (also lists the old file for deletion on GitHub)
            stage(new_rel)
        item["category"] = new
    elif body.get("move") in ("up", "down"):
        j = idx - 1 if body["move"] == "up" else idx + 1
        if 0 <= j < len(items):
            items[idx], items[j] = items[j], items[idx]
    save_items(items)
    return {}

def action_open_folder():
    os.makedirs(TO_UPLOAD, exist_ok=True)
    if sys.platform == "darwin": subprocess.Popen(["open", TO_UPLOAD])
    elif os.name == "nt": os.startfile(TO_UPLOAD)          # noqa
    else: subprocess.Popen(["xdg-open", TO_UPLOAD])

def action_clear_pending():
    if os.path.isdir(TO_UPLOAD):
        shutil.rmtree(TO_UPLOAD)

def state():
    text = read_config()
    w, h = canvas_size()
    return {"canvas": [w, h], "categories": get_categories(text), "items": get_items(text),
            "pending": pending()}


# ---------------------------------------------------------------------------
# The little web server
# ---------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "AlooAdmin"

    def log_message(self, *a):          # keep Terminal quiet
        pass

    # -- helpers --
    def _host_ok(self):
        return self.headers.get("Host", "") in (f"127.0.0.1:{PORT}", f"localhost:{PORT}")

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    # -- GET: the admin page, plus the game files for previews --
    def do_GET(self):
        if not self._host_ok():
            return self._send(403, "Forbidden", "text/plain")
        url = urllib.parse.urlparse(self.path)
        if url.path == "/admin":
            if urllib.parse.parse_qs(url.query).get("key", [""])[0] != KEY:
                return self._send(403, "Open the link printed in Terminal (it has a secret key).", "text/plain")
            html = open(os.path.join(HERE, "admin.html"), encoding="utf-8").read().replace("__KEY__", KEY)
            return self._send(200, html, "text/html; charset=utf-8")
        if url.path == "/api/state":
            if self.headers.get("X-Key") != KEY:
                return self._send(403, {"error": "bad key"})
            with LOCK:
                return self._send(200, state())
        # static files from the site (the game, thumbnails, fonts)
        rel = urllib.parse.unquote(url.path).lstrip("/") or "index.html"
        parts = rel.split("/")
        if any(p.startswith(".") or p == ".." for p in parts) or parts[0] in ("tools", "to-upload"):
            return self._send(404, "Not found", "text/plain")
        full = os.path.abspath(os.path.join(SITE, rel))
        if not full.startswith(SITE + os.sep) or not os.path.isfile(full):
            return self._send(404, "Not found", "text/plain")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        return self._send(200, open(full, "rb").read(), ctype)

    # -- POST: everything that changes something --
    def do_POST(self):
        if not self._host_ok() or self.headers.get("X-Key") != KEY:
            return self._send(403, {"error": "Not allowed."})
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        path = urllib.parse.urlparse(self.path).path
        try:
            with LOCK:
                if path == "/api/upload":
                    h = self.headers
                    res = action_upload(data,
                                        urllib.parse.unquote(h.get("X-Filename", "")),
                                        urllib.parse.unquote(h.get("X-Category", "")),
                                        urllib.parse.unquote(h.get("X-Name", "")))
                elif path == "/api/update":
                    res = action_update(json.loads(data or b"{}"))
                elif path == "/api/open-folder":
                    action_open_folder(); res = {}
                elif path == "/api/clear-pending":
                    action_clear_pending(); res = {}
                else:
                    return self._send(404, {"error": "unknown"})
            return self._send(200, dict(res, ok=True))
        except ValueError as e:
            return self._send(400, {"error": str(e)})
        except Exception as e:                        # unexpected: show it rather than crash
            return self._send(500, {"error": "Something went wrong: %s" % e})


def main():
    global PORT
    server = None
    for port in range(8800, 8820):
        try:
            PORT = port
            server = ThreadingHTTPServer(("127.0.0.1", port), Handler)   # 127.0.0.1 = this computer only
            break
        except OSError:
            continue
    if not server:
        sys.exit("Couldn't find a free port. Close other programs and try again.")
    url = f"http://127.0.0.1:{PORT}/admin?key={KEY}"
    print("\nAloo All Day admin is running (only on this computer).")
    print("If it doesn't open by itself, open this link:\n\n   " + url + "\n")
    print("Leave this window open while you work. Press Ctrl+C to stop.\n")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped. Bye!")


if __name__ == "__main__":
    main()
