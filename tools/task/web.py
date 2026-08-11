#!/usr/bin/env python3
"""task web — локал вэб интерфэйс.

Аюулгүй байдлын зарчим: энэ сервер зөвхөн тухайн компьютер дээрээс
хандах зориулалттай. Гаднаас дуудагдахаас сэргийлж дараах давхаргууд ажиллана:

  1. Зөвхөн loopback хаяг (127.0.0.1 / ::1) дээр сонсоно. Өөр хаяг өгвөл
     сервер асахгүй — 0.0.0.0 эсвэл LAN IP-г зориудаар хориглосон.
  2. TCP холболтын эх хаяг loopback биш бол хүсэлтийг шууд 403-аар татгалзана.
  3. Host толгойг шалгана (DNS rebinding довтолгооноос хамгаална).
  4. Өгөгдөл өөрчлөх бүх хүсэлт CSRF token шаардана. Token нь процесс бүрт
     санамсаргүй үүсэх ба зөвхөн серверийн өгсөн HTML дотор явна.
  5. Origin / Sec-Fetch-Site толгойг шалгана — өөр сайтаас илгээсэн хүсэлт
     татгалзагдана. CORS толгой хэзээ ч буцаахгүй тул өөр origin хариуг уншиж
     чадахгүй.
  6. Хатуу CSP болон холбогдох хамгаалалтын толгойнууд.
  7. Хүсэлтийн биеийн хэмжээ хязгаартай, статик файл нь зөвхөн зөвшөөрөгдсөн
     нэрсийн жагсаалтаас уншигдана (path traversal боломжгүй).

Нэмэлт сонголтууд: --auth (token шаардах), --read-only (зөвхөн уншина),
--idle-timeout (ажиллагаагүй үед автоматаар унтрах).
"""

from __future__ import annotations

import errno
import hmac
import json
import os
import secrets
import socket
import sys
import threading
import time
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

try:  # task.py-г шууд ажиллуулсан үед сурах бичгийн импорт ажиллана
    import task as core
except ImportError:  # pragma: no cover - зөвхөн ер бусын path тохиолдолд
    core = None

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "webui")

# Зөвхөн эдгээр статик файлыг өгнө — өөр ямар ч зам уншигдахгүй.
STATIC_FILES = {
    "/app.css": ("app.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
}

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]", "0:0:0:0:0:0:0:1"}
LOOPBACK_PEERS = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}

MAX_BODY = 64 * 1024          # 64 KiB — таскийн өгөгдөлд илүү хангалттай
MAX_TITLE = 500
MAX_NOTE = 5000
MAX_TAGS = 20

CSP = (
    "default-src 'none'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "connect-src 'self'; "
    "img-src 'self' data:; "
    "base-uri 'none'; "
    "form-action 'none'; "
    "frame-ancestors 'none'"
)


class WebError(Exception):
    """HTTP статустай алдаа."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# --------------------------------------------------------------- тохиргоо

class Config:
    def __init__(self, store_file: str, token: str | None = None,
                 read_only: bool = False, origins: set[str] | None = None):
        self.store_file = store_file
        self.csrf_token = secrets.token_urlsafe(32)
        self.auth_token = token           # None бол token шаардахгүй
        self.read_only = read_only
        self.origins = origins or set()
        self.lock = threading.Lock()
        self.last_request = time.time()


def is_loopback(host: str) -> bool:
    cleaned = host.strip().strip("[]").lower()
    if cleaned in LOOPBACK_HOSTS or cleaned in LOOPBACK_PEERS:
        return True
    try:
        packed = socket.inet_pton(socket.AF_INET, cleaned)
    except OSError:
        return False
    return packed[0] == 127


# ------------------------------------------------------------ өгөгдөл ажиллах

def task_view(task: dict, today: date) -> dict:
    left = core.days_left(task, today)
    return {
        **task,
        "days_left": left,
        "overdue": left is not None and left < 0 and core.is_open(task),
        "open": core.is_open(task),
    }


def build_state(cfg: Config, view: str, query: str, tag: str) -> dict:
    store = core.load_store(cfg.store_file)
    today = date.today()

    filters = SimpleNamespace(all=False, status=None, priority=None,
                              tag=[tag] if tag else None, due=None, grep=query)
    if view == "today":
        filters.due = "today"
    elif view == "overdue":
        filters.due = "overdue"
    elif view == "week":
        filters.due = "week"
    elif view == "done":
        filters.status = ["done", "cancelled"]
        filters.all = True
    elif view == "all":
        filters.all = True
    elif view != "open":
        raise WebError(400, f"'{view}' гэсэн харагдац байхгүй.")

    tasks = core.filter_tasks(store["tasks"], filters, today)
    tasks.sort(key=core.sort_key)

    every = store["tasks"]
    open_tasks = [t for t in every if core.is_open(t)]
    counts = {
        "open": len(open_tasks),
        "done": sum(1 for t in every if t["status"] == "done"),
        "total": len(every),
        "overdue": sum(1 for t in open_tasks
                       if (core.days_left(t, today) or 0) < 0
                       and t.get("due")),
        "today": sum(1 for t in open_tasks if core.days_left(t, today) == 0),
        "week": sum(1 for t in open_tasks
                    if core.days_left(t, today) is not None
                    and 0 <= core.days_left(t, today) <= 7),
    }
    tags: dict[str, int] = {}
    for task in open_tasks:
        for name in task.get("tags", []):
            tags[name] = tags.get(name, 0) + 1

    return {
        "tasks": [task_view(t, today) for t in tasks],
        "counts": counts,
        "tags": sorted(tags.items(), key=lambda kv: (-kv[1], kv[0])),
        "today": today.isoformat(),
        "view": view,
        "readOnly": cfg.read_only,
        "storeFile": cfg.store_file,
    }


def clean_payload(payload: dict, partial: bool) -> dict:
    """Клиентээс ирсэн өгөгдлийг шалгаж, task бичлэгийн талбарууд болгоно."""
    if not isinstance(payload, dict):
        raise WebError(400, "JSON объект хүлээж байна.")

    fields: dict = {}

    if "title" in payload or not partial:
        title = str(payload.get("title") or "").strip()
        if not title:
            raise WebError(400, "Гарчиг хоосон байна.")
        if len(title) > MAX_TITLE:
            raise WebError(400, f"Гарчиг {MAX_TITLE} тэмдэгтээс урт байна.")
        fields["title"] = title

    if "priority" in payload and payload["priority"] is not None:
        fields["priority"] = core.parse_priority(str(payload["priority"]))
    elif not partial:
        fields["priority"] = "med"

    if "status" in payload and payload["status"] is not None:
        fields["status"] = core.parse_status(str(payload["status"]))

    if "due" in payload:
        raw = payload["due"]
        fields["due"] = core.parse_date(str(raw)) if raw else None
    elif not partial:
        fields["due"] = None

    if "tags" in payload:
        raw_tags = payload["tags"]
        if isinstance(raw_tags, str):
            raw_tags = [raw_tags]
        if not isinstance(raw_tags, list):
            raise WebError(400, "tags нь жагсаалт байх ёстой.")
        tags = core.parse_tags([str(x) for x in raw_tags])
        if len(tags) > MAX_TAGS:
            raise WebError(400, f"Шошго {MAX_TAGS}-аас олон байна.")
        fields["tags"] = tags
    elif not partial:
        fields["tags"] = []

    if "note" in payload:
        note = str(payload.get("note") or "")
        if len(note) > MAX_NOTE:
            raise WebError(400, f"Тэмдэглэл {MAX_NOTE} тэмдэгтээс урт байна.")
        fields["note"] = note
    elif not partial:
        fields["note"] = ""

    return fields


def create_task(cfg: Config, payload: dict) -> dict:
    fields = clean_payload(payload, partial=False)
    with cfg.lock:
        store = core.load_store(cfg.store_file)
        task = {
            "id": store["next_id"],
            "status": "todo",
            "created": core.now_iso(),
            "updated": core.now_iso(),
            "done_at": None,
            **fields,
        }
        store["next_id"] += 1
        store["tasks"].append(task)
        core.save_store(cfg.store_file, store)
    return task


def update_task(cfg: Config, task_id: int, payload: dict) -> dict:
    fields = clean_payload(payload, partial=True)
    if not fields:
        raise WebError(400, "Өөрчлөх талбар алга.")
    with cfg.lock:
        store = core.load_store(cfg.store_file)
        task = core.find_task(store, task_id)
        task.update(fields)
        if "status" in fields:
            task["done_at"] = core.now_iso() if fields["status"] == "done" else None
        task["updated"] = core.now_iso()
        core.save_store(cfg.store_file, store)
    return task


def delete_task(cfg: Config, task_id: int) -> None:
    with cfg.lock:
        store = core.load_store(cfg.store_file)
        core.find_task(store, task_id)          # байхгүй бол алдаа өгнө
        store["tasks"] = [t for t in store["tasks"] if t["id"] != task_id]
        core.save_store(cfg.store_file, store)


# ---------------------------------------------------------------- handler

def make_handler(cfg: Config):

    class Handler(BaseHTTPRequestHandler):
        server_version = "task-web"
        sys_version = ""
        protocol_version = "HTTP/1.1"

        # -------------------------------------------------- аюулгүй байдал

        def guard(self, mutating: bool) -> None:
            """Хүсэлтийг зөвшөөрөх эсэхийг шалгана. Алдаатай бол WebError."""
            peer = self.client_address[0] if self.client_address else ""
            if peer not in LOOPBACK_PEERS and not is_loopback(peer):
                raise WebError(403, "Зөвхөн локал хандалт зөвшөөрөгдөнө.")

            host = (self.headers.get("Host") or "").strip()
            hostname = host.rsplit(":", 1)[0] if not host.startswith("[") \
                else host.split("]")[0] + "]"
            if hostname.lower() not in LOOPBACK_HOSTS:
                raise WebError(403, f"Host толгой зөвшөөрөгдөөгүй: {host}")

            fetch_site = (self.headers.get("Sec-Fetch-Site") or "").lower()
            if fetch_site and fetch_site not in ("same-origin", "none"):
                raise WebError(403, "Өөр сайтаас ирсэн хүсэлт хориглогдоно.")

            origin = self.headers.get("Origin")
            if origin and origin not in cfg.origins:
                raise WebError(403, f"Origin зөвшөөрөгдөөгүй: {origin}")

            if cfg.auth_token and not self._token_ok():
                raise WebError(401, "Token шаардлагатай эсвэл буруу байна.")

            if mutating:
                if cfg.read_only:
                    raise WebError(403, "Сервер зөвхөн унших горимд ажиллаж байна.")
                sent = self.headers.get("X-CSRF-Token") or ""
                if not hmac.compare_digest(sent, cfg.csrf_token):
                    raise WebError(403, "CSRF token буруу байна.")

        def _token_ok(self) -> bool:
            candidates = []
            header = self.headers.get("X-Task-Token")
            if header:
                candidates.append(header)
            query = parse_qs(urlparse(self.path).query).get("token")
            if query:
                candidates.append(query[0])
            for chunk in (self.headers.get("Cookie") or "").split(";"):
                name, _, value = chunk.strip().partition("=")
                if name == "task_token":
                    candidates.append(value)
            return any(hmac.compare_digest(c, cfg.auth_token) for c in candidates)

        # -------------------------------------------------------- хариултууд

        def send_common_headers(self, content_type: str, length: int) -> None:
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(length))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Content-Security-Policy", CSP)
            self.send_header("Permissions-Policy",
                             "geolocation=(), microphone=(), camera=()")
            # CORS толгой зориудаар байхгүй — өөр origin хариуг уншиж чадахгүй.

        def respond(self, status: int, body: bytes, content_type: str,
                    extra: list[tuple[str, str]] | None = None) -> None:
            self.send_response(status)
            self.send_common_headers(content_type, len(body))
            for key, value in extra or []:
                self.send_header(key, value)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def respond_json(self, payload, status: int = 200,
                         extra: list[tuple[str, str]] | None = None) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.respond(status, body, "application/json; charset=utf-8", extra)

        def respond_error(self, status: int, message: str) -> None:
            self.respond_json({"error": message}, status)

        # ---------------------------------------------------------- уншилт

        def read_json(self) -> dict:
            raw_length = self.headers.get("Content-Length")
            if raw_length is None:
                raise WebError(411, "Content-Length шаардлагатай.")
            try:
                length = int(raw_length)
            except ValueError as exc:
                raise WebError(400, "Content-Length буруу байна.") from exc
            if length < 0 or length > MAX_BODY:
                raise WebError(413, f"Хүсэлт хэтэрхий том ({MAX_BODY} байтаас их).")
            ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip()
            if ctype != "application/json":
                raise WebError(415, "Content-Type нь application/json байх ёстой.")
            try:
                return json.loads(self.rfile.read(length).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise WebError(400, f"JSON задлахад алдаа: {exc}") from exc

        # -------------------------------------------------------- маршрутууд

        def handle_request(self, mutating: bool):
            cfg.last_request = time.time()
            self.guard(mutating)

            parsed = urlparse(self.path)
            path = parsed.path
            params = parse_qs(parsed.query)

            if self.command in ("GET", "HEAD"):
                if path == "/":
                    return self.serve_index()
                if path in STATIC_FILES:
                    return self.serve_static(path)
                if path == "/api/state":
                    return self.respond_json(build_state(
                        cfg,
                        params.get("view", ["open"])[0],
                        params.get("q", [""])[0].strip(),
                        params.get("tag", [""])[0].strip(),
                    ))
                if path == "/api/export":
                    return self.serve_export(params)
                raise WebError(404, "Ийм хаяг байхгүй.")

            if self.command == "POST" and path == "/api/tasks":
                create_task(cfg, self.read_json())
                return self.respond_json(build_state(cfg, "open", "", ""), 201)

            task_id = self.parse_task_id(path)
            if self.command == "PATCH" and task_id is not None:
                update_task(cfg, task_id, self.read_json())
                view = params.get("view", ["open"])[0]
                return self.respond_json(build_state(cfg, view, "", ""))
            if self.command == "DELETE" and task_id is not None:
                delete_task(cfg, task_id)
                view = params.get("view", ["open"])[0]
                return self.respond_json(build_state(cfg, view, "", ""))

            raise WebError(404, "Ийм хаяг байхгүй.")

        @staticmethod
        def parse_task_id(path: str) -> int | None:
            prefix = "/api/tasks/"
            if not path.startswith(prefix):
                return None
            rest = path[len(prefix):]
            return int(rest) if rest.isdigit() else None

        def serve_index(self) -> None:
            with open(os.path.join(WEB_DIR, "index.html"), encoding="utf-8") as fh:
                html = fh.read()
            html = html.replace("{{CSRF}}", cfg.csrf_token)
            html = html.replace("{{READONLY}}", "1" if cfg.read_only else "0")
            extra = []
            if cfg.auth_token and self._token_ok():
                extra.append(("Set-Cookie",
                              f"task_token={cfg.auth_token}; Path=/; "
                              "SameSite=Strict; HttpOnly"))
            self.respond(200, html.encode("utf-8"), "text/html; charset=utf-8", extra)

        def serve_static(self, path: str) -> None:
            name, ctype = STATIC_FILES[path]
            with open(os.path.join(WEB_DIR, name), "rb") as fh:
                self.respond(200, fh.read(), ctype)

        def serve_export(self, params: dict) -> None:
            fmt = params.get("format", ["md"])[0]
            if fmt not in ("md", "csv", "json"):
                raise WebError(400, f"'{fmt}' формат дэмжигдэхгүй.")
            store = core.load_store(cfg.store_file)
            tasks = sorted(store["tasks"], key=core.sort_key)
            body = core.render_export(tasks, fmt).encode("utf-8")
            ctype = {"md": "text/markdown; charset=utf-8",
                     "csv": "text/csv; charset=utf-8",
                     "json": "application/json; charset=utf-8"}[fmt]
            self.respond(200, body, ctype, [
                ("Content-Disposition", f'attachment; filename="tasks.{fmt}"'),
            ])

        # ------------------------------------------------------ HTTP verbs

        def dispatch(self, mutating: bool) -> None:
            try:
                self.handle_request(mutating)
            except WebError as exc:
                self.respond_error(exc.status, exc.message)
            except core.TaskError as exc:
                self.respond_error(400, str(exc))
            except FileNotFoundError:
                self.respond_error(404, "Файл олдсонгүй.")
            except Exception as exc:                     # pragma: no cover
                self.log_error("дотоод алдаа: %r", exc)
                self.respond_error(500, "Дотоод алдаа гарлаа.")

        def do_GET(self):
            self.dispatch(False)

        def do_HEAD(self):
            self.dispatch(False)

        def do_POST(self):
            self.dispatch(True)

        def do_PATCH(self):
            self.dispatch(True)

        def do_DELETE(self):
            self.dispatch(True)

        def do_PUT(self):
            self.respond_error(405, "PUT дэмжигдэхгүй.")

        def do_OPTIONS(self):
            # CORS preflight-д хэзээ ч зөвшөөрөл өгөхгүй.
            self.respond_error(405, "OPTIONS дэмжигдэхгүй.")

        def log_message(self, fmt, *args):
            if os.environ.get("TASK_WEB_QUIET"):
                return
            sys.stderr.write("[task-web] %s — %s\n" % (
                self.address_string(), fmt % args))

    return Handler


# ----------------------------------------------------------------- сервер

def create_server(store_file: str, host: str = "127.0.0.1", port: int = 8787,
                  token: str | None = None, read_only: bool = False):
    """Loopback дээр сервер үүсгэнэ. Локал биш хаяг өгвөл алдаа заана."""
    if not is_loopback(host):
        raise core.TaskError(
            f"'{host}' нь локал хаяг биш байна. Аюулгүй байдлын үүднээс "
            "энэ сервер зөвхөн 127.0.0.1 / ::1 дээр ажиллана."
        )

    cfg = Config(store_file, token=token, read_only=read_only)
    try:
        server = ThreadingHTTPServer((host, port), make_handler(cfg))
    except PermissionError as exc:
        raise core.TaskError(
            f"{port} порт руу холбогдох эрх алга. 1024-ээс доош портыг зөвхөн "
            "root ашиглаж чадна — 8088, 8787 гэх мэт 1024-өөс дээш портыг "
            "сонгоно уу."
        ) from exc
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            raise core.TaskError(
                f"{port} порт аль хэдийн ашиглагдаж байна. Өөр порт сонгох "
                f"эсвэл ажиллаж буй үйлчилгээг зогсооно уу "
                f"(macOS: lsof -nP -iTCP:{port} -sTCP:LISTEN)."
            ) from exc
        raise core.TaskError(f"{host}:{port} дээр сервер асааж чадсангүй: {exc}") from exc

    server.daemon_threads = True
    server.config = cfg

    actual_port = server.server_address[1]
    cfg.origins = {
        f"http://127.0.0.1:{actual_port}",
        f"http://localhost:{actual_port}",
        f"http://[::1]:{actual_port}",
    }
    return server


def watch_idle(server, minutes: int) -> None:
    """Тодорхой хугацаанд хүсэлт ирэхгүй бол серверийг унтраана."""
    limit = minutes * 60

    def loop():
        while True:
            time.sleep(5)
            if time.time() - server.config.last_request > limit:
                sys.stderr.write(
                    f"\n[task-web] {minutes} минут ажиллагаагүй тул унтарлаа.\n")
                server.shutdown()
                return

    threading.Thread(target=loop, daemon=True).start()


def run(args, core_module=None) -> int:
    """task.py-ийн 'web' дэд командаас дуудагдана."""
    global core
    if core_module is not None:
        core = core_module

    token = args.token or (secrets.token_urlsafe(24) if args.auth else None)
    server = create_server(args._path, host=args.host, port=args.port,
                           token=token, read_only=args.read_only)
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/"
    if token:
        url += f"?token={token}"

    print(f"Локал вэб интерфэйс: {url}")
    print(f"Өгөгдлийн файл:      {args._path}")
    print(f"Горим:               "
          f"{'зөвхөн унших' if args.read_only else 'бүрэн эрх'}"
          f"{', token шаардана' if token else ''}")
    print("Зөвхөн энэ компьютерээс хандах боломжтой. Зогсоох: Ctrl+C")

    if args.idle_timeout:
        watch_idle(server, args.idle_timeout)
    if args.open:
        import webbrowser
        threading.Timer(0.4, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер зогслоо.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import task as _core

    sys.exit(_core.main(["web"] + sys.argv[1:]))
