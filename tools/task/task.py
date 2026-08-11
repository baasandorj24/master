#!/usr/bin/env python3
"""task — локал (offline) ажиллагаатай таск менежментийн CLI хэрэгсэл.

Өгөгдөл нь ганц JSON файлд хадгалагдана. Сервер, интернэт, нэмэлт сан
шаардахгүй. Файлын байршлыг TASK_FILE орчны хувьсагчаар солино.

Жишээ:
    task add "Тайлан бичих" -p high -d маргааш -t ажил
    task ls --due week
    task done 3
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import tempfile
from datetime import date, datetime, timedelta

VERSION = "1.0.0"
SCHEMA_VERSION = 1

DEFAULT_FILE = os.path.join(os.path.expanduser("~"), ".tasks.json")

# ---------------------------------------------------------------- тогтмолууд

STATUSES = ("todo", "doing", "done", "cancelled")

STATUS_LABEL = {
    "todo": "хүлээгдэж буй",
    "doing": "хийгдэж буй",
    "done": "дууссан",
    "cancelled": "цуцлагдсан",
}

STATUS_MARK = {"todo": "[ ]", "doing": "[~]", "done": "[x]", "cancelled": "[-]"}

STATUS_ALIASES = {
    "todo": "todo", "t": "todo", "new": "todo", "хүлээгдэж": "todo",
    "doing": "doing", "wip": "doing", "start": "doing", "хийгдэж": "doing",
    "done": "done", "d": "done", "finished": "done", "дууссан": "done",
    "cancelled": "cancelled", "canceled": "cancelled", "x": "cancelled",
    "цуцлагдсан": "cancelled",
}

PRIORITIES = ("low", "med", "high", "urgent")
PRIORITY_RANK = {"low": 0, "med": 1, "high": 2, "urgent": 3}

PRIORITY_LABEL = {
    "low": "бага",
    "med": "дунд",
    "high": "өндөр",
    "urgent": "яаралтай",
}

PRIORITY_ALIASES = {
    "low": "low", "l": "low", "1": "low", "бага": "low",
    "med": "med", "medium": "med", "m": "med", "2": "med", "дунд": "med",
    "high": "high", "h": "high", "3": "high", "өндөр": "high",
    "urgent": "urgent", "u": "urgent", "crit": "urgent", "4": "urgent",
    "яаралтай": "urgent",
}

# Дэд командын монгол нэрс
COMMAND_ALIASES = {
    "нэм": "add",
    "жагсаалт": "list",
    "ls": "list",
    "дуусга": "done",
    "эхлүүл": "start",
    "засах": "edit",
    "устга": "rm",
    "del": "rm",
    "delete": "rm",
    "харах": "show",
    "хайх": "search",
    "статистик": "stats",
    "дараагийн": "next",
    "цуцла": "cancel",
    "гаргах": "export",
    "оруулах": "import",
    "цэвэрлэх": "purge",
}

# ------------------------------------------------------------------- өнгө

class Color:
    """ANSI өнгө. Терминал биш үед автоматаар унтарна."""

    enabled = False

    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"

    @classmethod
    def setup(cls, stream) -> None:
        cls.enabled = (
            hasattr(stream, "isatty")
            and stream.isatty()
            and os.environ.get("NO_COLOR") is None
            and os.environ.get("TERM") != "dumb"
        )

    @classmethod
    def paint(cls, text: str, *codes: str) -> str:
        if not cls.enabled or not codes:
            return text
        return "".join(codes) + text + cls.RESET


PRIORITY_COLOR = {
    "low": Color.DIM,
    "med": "",
    "high": Color.YELLOW,
    "urgent": Color.RED,
}


class TaskError(Exception):
    """Хэрэглэгчид харуулах алдаа."""


# --------------------------------------------------------------- хадгалалт

def store_path(explicit: str | None = None) -> str:
    return explicit or os.environ.get("TASK_FILE") or DEFAULT_FILE


def empty_store() -> dict:
    return {"version": SCHEMA_VERSION, "next_id": 1, "tasks": []}


def load_store(path: str) -> dict:
    if not os.path.exists(path):
        return empty_store()
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        raise TaskError(f"'{path}' файл эвдэрсэн байна: {exc}") from exc
    if not isinstance(data, dict) or "tasks" not in data:
        raise TaskError(f"'{path}' нь task-ийн өгөгдлийн файл биш байна.")
    data.setdefault("version", SCHEMA_VERSION)
    data.setdefault("tasks", [])
    known = [t["id"] for t in data["tasks"] if isinstance(t.get("id"), int)]
    data.setdefault("next_id", (max(known) + 1) if known else 1)
    return data


def save_store(path: str, data: dict) -> None:
    """Атомик бичилт — бичих явцад тасарсан ч хуучин файл эвдрэхгүй."""
    directory = os.path.dirname(os.path.abspath(path))
    os.makedirs(directory, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".tasks-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


# ------------------------------------------------------------ утга задлагч

def parse_priority(value: str) -> str:
    key = value.strip().lower()
    if key not in PRIORITY_ALIASES:
        raise TaskError(
            f"'{value}' гэсэн ач холбогдол байхгүй. "
            f"Сонголт: {', '.join(PRIORITIES)}"
        )
    return PRIORITY_ALIASES[key]


def parse_status(value: str) -> str:
    key = value.strip().lower()
    if key not in STATUS_ALIASES:
        raise TaskError(
            f"'{value}' гэсэн төлөв байхгүй. Сонголт: {', '.join(STATUSES)}"
        )
    return STATUS_ALIASES[key]


def parse_date(value: str, today: date | None = None) -> str:
    """Хугацааг ISO (YYYY-MM-DD) болгож хөрвүүлнэ.

    Дэмжих хэлбэрүүд: 2026-08-20, 08-20, өнөөдөр/today, маргааш/tomorrow,
    +3d, +2w, 3 (3 хоногийн дараа).
    """
    today = today or date.today()
    raw = value.strip().lower()

    relative = {
        "today": 0, "өнөөдөр": 0, "todya": 0,
        "tomorrow": 1, "маргааш": 1,
        "yesterday": -1, "өчигдөр": -1,
        "week": 7, "долоо": 7, "долоохоног": 7,
    }
    if raw in relative:
        return (today + timedelta(days=relative[raw])).isoformat()

    match = re.fullmatch(r"\+?(\d+)\s*([dhw]|хоног|долоо)?", raw)
    if match:
        amount = int(match.group(1))
        unit = match.group(2) or "d"
        days = amount * (7 if unit in ("w", "долоо") else 1)
        return (today + timedelta(days=days)).isoformat()

    for fmt, needs_year in (("%Y-%m-%d", False), ("%m-%d", True), ("%Y/%m/%d", False)):
        try:
            parsed = datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
        if needs_year:
            parsed = parsed.replace(year=today.year)
            if parsed < today - timedelta(days=180):
                parsed = parsed.replace(year=today.year + 1)
        return parsed.isoformat()

    raise TaskError(
        f"'{value}' хугацааг ойлгосонгүй. Жишээ: 2026-08-20, маргааш, +3d"
    )


def parse_tags(values: list[str] | None) -> list[str]:
    tags: list[str] = []
    for chunk in values or []:
        for tag in re.split(r"[,\s]+", chunk):
            tag = tag.strip().lstrip("#").lower()
            if tag and tag not in tags:
                tags.append(tag)
    return tags


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


# ---------------------------------------------------------------- туслахууд

def find_task(store: dict, task_id: int) -> dict:
    for task in store["tasks"]:
        if task["id"] == task_id:
            return task
    raise TaskError(f"#{task_id} дугаартай таск олдсонгүй.")


def days_left(task: dict, today: date | None = None) -> int | None:
    if not task.get("due"):
        return None
    today = today or date.today()
    return (date.fromisoformat(task["due"]) - today).days


def is_open(task: dict) -> bool:
    return task["status"] in ("todo", "doing")


def sort_key(task: dict):
    """Нээлттэй нь эхэнд, дараа нь ач холбогдол, дараа нь хугацаа."""
    open_rank = 0 if is_open(task) else 1
    prio_rank = -PRIORITY_RANK[task["priority"]]
    due_rank = task.get("due") or "9999-99-99"
    return (open_rank, prio_rank, due_rank, task["id"])


def format_due(task: dict, today: date | None = None) -> str:
    due = task.get("due")
    if not due:
        return ""
    left = days_left(task, today)
    if task["status"] in ("done", "cancelled"):
        return due
    if left < 0:
        return Color.paint(f"{due} ({abs(left)}х хоцорсон)", Color.RED, Color.BOLD)
    if left == 0:
        return Color.paint(f"{due} (өнөөдөр)", Color.YELLOW, Color.BOLD)
    if left == 1:
        return Color.paint(f"{due} (маргааш)", Color.YELLOW)
    return f"{due} ({left}х)"


def visible_len(text: str) -> int:
    return len(re.sub(r"\033\[[0-9;]*m", "", text))


def print_table(rows: list[list[str]], headers: list[str]) -> None:
    if not rows:
        return
    widths = [visible_len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], visible_len(cell))

    def line(cells: list[str], dim: bool = False) -> str:
        parts = []
        for i, cell in enumerate(cells):
            pad = " " * (widths[i] - visible_len(cell))
            parts.append(cell + pad)
        text = "  ".join(parts).rstrip()
        return Color.paint(text, Color.DIM) if dim else text

    print(line(headers, dim=True))
    for row in rows:
        print(line(row))


def render_task_line(task: dict, today: date | None = None) -> list[str]:
    mark = STATUS_MARK[task["status"]]
    title = task["title"]
    if task["status"] in ("done", "cancelled"):
        title = Color.paint(title, Color.DIM)
    prio = Color.paint(
        PRIORITY_LABEL[task["priority"]], PRIORITY_COLOR[task["priority"]]
    )
    tags = Color.paint(
        " ".join("#" + t for t in task.get("tags", [])), Color.CYAN
    )
    return [
        Color.paint(f"#{task['id']}", Color.BOLD),
        mark,
        prio,
        format_due(task, today),
        title,
        tags,
    ]


TABLE_HEADERS = ["ID", "", "АЧ Х.", "ХУГАЦАА", "ГАРЧИГ", "ШОШГО"]


# ------------------------------------------------------------------ шүүлтүүр

def filter_tasks(tasks: list[dict], args, today: date | None = None) -> list[dict]:
    today = today or date.today()
    result = list(tasks)

    status = getattr(args, "status", None)
    if status:
        wanted = {parse_status(s) for s in status}
        result = [t for t in result if t["status"] in wanted]
    elif not getattr(args, "all", False):
        result = [t for t in result if is_open(t)]

    priority = getattr(args, "priority", None)
    if priority:
        wanted_p = {parse_priority(p) for p in priority}
        result = [t for t in result if t["priority"] in wanted_p]

    tags = parse_tags(getattr(args, "tag", None))
    if tags:
        result = [t for t in result if set(tags) & set(t.get("tags", []))]

    due = getattr(args, "due", None)
    if due:
        result = [t for t in result if matches_due(t, due, today)]

    query = getattr(args, "query", None) or getattr(args, "grep", None)
    if query:
        needle = query.lower()
        result = [
            t for t in result
            if needle in t["title"].lower()
            or needle in (t.get("note") or "").lower()
            or any(needle in tag for tag in t.get("tags", []))
        ]

    return result


def matches_due(task: dict, mode: str, today: date) -> bool:
    mode = mode.strip().lower()
    left = days_left(task, today)
    if mode in ("none", "байхгүй"):
        return left is None
    if mode in ("any", "бүх"):
        return left is not None
    if left is None:
        return False
    if mode in ("overdue", "хоцорсон"):
        return left < 0 and is_open(task)
    if mode in ("today", "өнөөдөр"):
        return left <= 0
    if mode in ("tomorrow", "маргааш"):
        return left <= 1
    if mode in ("week", "долоо"):
        return left <= 7
    if mode in ("month", "сар"):
        return left <= 30
    # Тодорхой огноо хүртэл
    limit = date.fromisoformat(parse_date(mode, today))
    return date.fromisoformat(task["due"]) <= limit


# -------------------------------------------------------------------- команд

def cmd_add(args, store: dict) -> int:
    title = " ".join(args.title).strip()
    if not title:
        raise TaskError("Таскийн гарчиг хоосон байна.")

    task = {
        "id": store["next_id"],
        "title": title,
        "status": "todo",
        "priority": parse_priority(args.priority) if args.priority else "med",
        "tags": parse_tags(args.tag),
        "due": parse_date(args.due) if args.due else None,
        "note": args.note or "",
        "created": now_iso(),
        "updated": now_iso(),
        "done_at": None,
    }
    store["next_id"] += 1
    store["tasks"].append(task)
    save_store(args._path, store)
    print(f"Нэмэгдлээ: " + " ".join(x for x in render_task_line(task) if x))
    return 0


def cmd_list(args, store: dict) -> int:
    tasks = filter_tasks(store["tasks"], args)
    tasks.sort(key=sort_key)
    if args.limit:
        tasks = tasks[: args.limit]

    if not tasks:
        print(Color.paint("Тохирох таск алга.", Color.DIM))
        return 0

    if args.group:
        groups: dict[str, list[dict]] = {}
        for task in tasks:
            key = task["status"] if args.group == "status" else task["priority"]
            groups.setdefault(key, []).append(task)
        order = STATUSES if args.group == "status" else tuple(reversed(PRIORITIES))
        labels = STATUS_LABEL if args.group == "status" else PRIORITY_LABEL
        for key in order:
            if key not in groups:
                continue
            print(Color.paint(f"\n{labels[key].upper()} ({len(groups[key])})", Color.BOLD))
            print_table([render_task_line(t) for t in groups[key]], TABLE_HEADERS)
    else:
        print_table([render_task_line(t) for t in tasks], TABLE_HEADERS)

    open_count = sum(1 for t in tasks if is_open(t))
    print(Color.paint(f"\nНийт {len(tasks)} таск, {open_count} нь нээлттэй.", Color.DIM))
    return 0


def cmd_show(args, store: dict) -> int:
    task = find_task(store, args.id)
    left = days_left(task)
    rows = [
        ("ID", f"#{task['id']}"),
        ("Гарчиг", task["title"]),
        ("Төлөв", STATUS_LABEL[task["status"]]),
        ("Ач холбогдол", PRIORITY_LABEL[task["priority"]]),
        ("Хугацаа", task["due"] or "—"),
        ("Үлдсэн", "—" if left is None else f"{left} хоног"),
        ("Шошго", " ".join("#" + t for t in task.get("tags", [])) or "—"),
        ("Тэмдэглэл", task.get("note") or "—"),
        ("Үүсгэсэн", task["created"]),
        ("Зассан", task["updated"]),
        ("Дууссан", task.get("done_at") or "—"),
    ]
    width = max(len(k) for k, _ in rows)
    for key, value in rows:
        print(f"{Color.paint(key.ljust(width), Color.DIM)}  {value}")
    return 0


def _set_status(args, store: dict, status: str, ids: list[int]) -> int:
    changed = []
    for task_id in ids:
        task = find_task(store, task_id)
        task["status"] = status
        task["updated"] = now_iso()
        task["done_at"] = now_iso() if status == "done" else None
        changed.append(task)
    save_store(args._path, store)
    for task in changed:
        print(f"{STATUS_MARK[status]} #{task['id']} {task['title']} "
              f"→ {STATUS_LABEL[status]}")
    return 0


def cmd_done(args, store: dict) -> int:
    return _set_status(args, store, "done", args.id)


def cmd_start(args, store: dict) -> int:
    return _set_status(args, store, "doing", args.id)


def cmd_reopen(args, store: dict) -> int:
    return _set_status(args, store, "todo", args.id)


def cmd_cancel(args, store: dict) -> int:
    return _set_status(args, store, "cancelled", args.id)


def cmd_edit(args, store: dict) -> int:
    task = find_task(store, args.id)
    touched = []

    if args.title:
        task["title"] = " ".join(args.title).strip()
        touched.append("гарчиг")
    if args.priority:
        task["priority"] = parse_priority(args.priority)
        touched.append("ач холбогдол")
    if args.status:
        task["status"] = parse_status(args.status)
        task["done_at"] = now_iso() if task["status"] == "done" else None
        touched.append("төлөв")
    if args.due:
        task["due"] = parse_date(args.due)
        touched.append("хугацаа")
    if args.clear_due:
        task["due"] = None
        touched.append("хугацаа (арилгав)")
    if args.note is not None:
        task["note"] = args.note
        touched.append("тэмдэглэл")
    if args.tag:
        task["tags"] = parse_tags(args.tag)
        touched.append("шошго")
    if args.add_tag:
        merged = task.get("tags", []) + parse_tags(args.add_tag)
        task["tags"] = parse_tags(merged)
        touched.append("шошго нэмэв")
    if args.rm_tag:
        drop = set(parse_tags(args.rm_tag))
        task["tags"] = [t for t in task.get("tags", []) if t not in drop]
        touched.append("шошго хаслаа")

    if not touched:
        raise TaskError("Юу засахаа заана уу (--title, --due, -p, -t гэх мэт).")

    task["updated"] = now_iso()
    save_store(args._path, store)
    print(f"#{task['id']} шинэчлэгдлээ ({', '.join(touched)}).")
    return 0


def cmd_rm(args, store: dict) -> int:
    targets = [find_task(store, i) for i in args.id]
    if not args.yes:
        listing = ", ".join(f"#{t['id']} {t['title']}" for t in targets)
        answer = input(f"{listing} — устгах уу? [y/N] ").strip().lower()
        if answer not in ("y", "yes", "т", "тийм"):
            print("Болих.")
            return 1
    ids = {t["id"] for t in targets}
    store["tasks"] = [t for t in store["tasks"] if t["id"] not in ids]
    save_store(args._path, store)
    for task in targets:
        print(f"Устгав: #{task['id']} {task['title']}")
    return 0


def cmd_next(args, store: dict) -> int:
    tasks = [t for t in store["tasks"] if is_open(t)]
    if not tasks:
        print(Color.paint("Нээлттэй таск байхгүй. 🎉", Color.GREEN))
        return 0
    tasks.sort(key=sort_key)
    print_table([render_task_line(t) for t in tasks[: args.count]], TABLE_HEADERS)
    return 0


def cmd_search(args, store: dict) -> int:
    args.all = True
    return cmd_list(args, store)


def cmd_stats(args, store: dict) -> int:
    tasks = store["tasks"]
    today = date.today()
    by_status = {s: 0 for s in STATUSES}
    by_priority = {p: 0 for p in PRIORITIES}
    tag_counts: dict[str, int] = {}
    overdue = 0
    due_today = 0
    done_week = 0

    for task in tasks:
        by_status[task["status"]] += 1
        if is_open(task):
            by_priority[task["priority"]] += 1
            left = days_left(task, today)
            if left is not None and left < 0:
                overdue += 1
            elif left == 0:
                due_today += 1
        for tag in task.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        if task.get("done_at"):
            finished = datetime.fromisoformat(task["done_at"]).date()
            if (today - finished).days <= 7:
                done_week += 1

    total = len(tasks)
    closed = by_status["done"] + by_status["cancelled"]
    percent = (by_status["done"] / total * 100) if total else 0.0

    print(Color.paint("ТӨЛӨВ", Color.BOLD))
    for status in STATUSES:
        print(f"  {STATUS_LABEL[status]:<14} {by_status[status]}")

    print(Color.paint("\nНЭЭЛТТЭЙ ТАСКИЙН АЧ ХОЛБОГДОЛ", Color.BOLD))
    for prio in reversed(PRIORITIES):
        print(f"  {PRIORITY_LABEL[prio]:<14} {by_priority[prio]}")

    print(Color.paint("\nХУГАЦАА", Color.BOLD))
    print(f"  {'хоцорсон':<18} "
          + Color.paint(str(overdue), Color.RED if overdue else ""))
    print(f"  {'өнөөдөр дуусах':<18} {due_today}")
    print(f"  {'7 хоногт дууссан':<18} {done_week}")

    if tag_counts:
        print(Color.paint("\nШОШГО", Color.BOLD))
        top = sorted(tag_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:10]
        for tag, count in top:
            print(f"  #{tag:<13} {count}")

    print(Color.paint(
        f"\nНийт {total} таск, {closed} хаагдсан, гүйцэтгэл {percent:.0f}%.",
        Color.DIM,
    ))
    return 0


def cmd_export(args, store: dict) -> int:
    tasks = filter_tasks(store["tasks"], args)
    tasks.sort(key=sort_key)
    text = render_export(tasks, args.format)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"{len(tasks)} таск '{args.output}' руу гаргалаа.")
    else:
        sys.stdout.write(text)
    return 0


def render_export(tasks: list[dict], fmt: str) -> str:
    if fmt == "json":
        return json.dumps(tasks, ensure_ascii=False, indent=2) + "\n"

    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            ["id", "title", "status", "priority", "due", "tags", "note", "created"]
        )
        for task in tasks:
            writer.writerow([
                task["id"], task["title"], task["status"], task["priority"],
                task.get("due") or "", ";".join(task.get("tags", [])),
                task.get("note") or "", task["created"],
            ])
        return buf.getvalue()

    if fmt == "md":
        lines = ["# Таскийн жагсаалт", ""]
        for status in STATUSES:
            group = [t for t in tasks if t["status"] == status]
            if not group:
                continue
            lines.append(f"## {STATUS_LABEL[status].capitalize()}")
            lines.append("")
            for task in group:
                box = "x" if status == "done" else " "
                bits = [f"- [{box}] **#{task['id']}** {task['title']}"]
                meta = [PRIORITY_LABEL[task["priority"]]]
                if task.get("due"):
                    meta.append(f"хугацаа: {task['due']}")
                if task.get("tags"):
                    meta.extend("#" + t for t in task["tags"])
                bits.append(f" _({', '.join(meta)})_")
                lines.append("".join(bits))
                if task.get("note"):
                    lines.append(f"  - {task['note']}")
            lines.append("")
        return "\n".join(lines).rstrip() + "\n"

    raise TaskError(f"'{fmt}' формат дэмжигдэхгүй.")


def cmd_import(args, store: dict) -> int:
    with open(args.file, encoding="utf-8") as fh:
        payload = json.load(fh)
    incoming = payload["tasks"] if isinstance(payload, dict) else payload
    if not isinstance(incoming, list):
        raise TaskError("Оруулах файл нь таскийн жагсаалт байх ёстой.")

    added = 0
    for raw in incoming:
        title = (raw.get("title") or "").strip()
        if not title:
            continue
        if not args.duplicates and any(
            t["title"] == title and t["status"] == raw.get("status", "todo")
            for t in store["tasks"]
        ):
            continue
        store["tasks"].append({
            "id": store["next_id"],
            "title": title,
            "status": parse_status(raw.get("status", "todo")),
            "priority": parse_priority(str(raw.get("priority", "med"))),
            "tags": parse_tags(raw.get("tags")),
            "due": parse_date(raw["due"]) if raw.get("due") else None,
            "note": raw.get("note") or "",
            "created": raw.get("created") or now_iso(),
            "updated": now_iso(),
            "done_at": raw.get("done_at"),
        })
        store["next_id"] += 1
        added += 1

    save_store(args._path, store)
    print(f"{added} таск нэмэгдлээ.")
    return 0


def cmd_purge(args, store: dict) -> int:
    today = date.today()
    keep, dropped = [], []
    for task in store["tasks"]:
        closed = task["status"] in ("done", "cancelled")
        if not closed:
            keep.append(task)
            continue
        stamp = task.get("done_at") or task.get("updated") or task["created"]
        age = (today - datetime.fromisoformat(stamp).date()).days
        (dropped if age >= args.days else keep).append(task)

    if not dropped:
        print("Цэвэрлэх таск алга.")
        return 0
    if args.dry_run:
        for task in dropped:
            print(f"устгах байсан: #{task['id']} {task['title']}")
        return 0

    store["tasks"] = keep
    save_store(args._path, store)
    print(f"{len(dropped)} хаагдсан таск устгав.")
    return 0


def cmd_path(args, store: dict) -> int:
    print(args._path)
    return 0


# --------------------------------------------------------------------- CLI

def add_filter_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("-s", "--status", action="append",
                        help="төлөвөөр шүүх (todo/doing/done/cancelled)")
    parser.add_argument("-p", "--priority", action="append",
                        help="ач холбогдлоор шүүх (low/med/high/urgent)")
    parser.add_argument("-t", "--tag", action="append", help="шошгоор шүүх")
    parser.add_argument("-d", "--due",
                        help="хугацаагаар шүүх: overdue/today/week/month/none/огноо")
    parser.add_argument("-g", "--grep", help="гарчиг, тэмдэглэлээс хайх")
    parser.add_argument("-a", "--all", action="store_true",
                        help="хаагдсан таскуудыг ч харуулах")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="task",
        description="Локал таск менежментийн хэрэгсэл (өгөгдөл нь JSON файлд).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Жишээ:\n"
            "  task add \"Тайлан бичих\" -p high -d маргааш -t ажил\n"
            "  task ls --due week --group status\n"
            "  task start 3 && task done 3\n"
            "  task export --format md -o TASKS.md\n"
        ),
    )
    # dest нь store_file — 'import' дэд командын 'file' аргументтай мөргөлдөхөөс сэргийлнэ.
    parser.add_argument("--file", dest="store_file",
                        help="өгөгдлийн файлын зам (эсвэл TASK_FILE)")
    parser.add_argument("--no-color", action="store_true", help="өнгө хэрэглэхгүй")
    parser.add_argument("--version", action="version", version=f"task {VERSION}")

    sub = parser.add_subparsers(dest="command")

    p_add = sub.add_parser("add", help="шинэ таск нэмэх")
    p_add.add_argument("title", nargs="+", help="таскийн гарчиг")
    p_add.add_argument("-p", "--priority", help="low | med | high | urgent")
    p_add.add_argument("-d", "--due", help="огноо: 2026-08-20, маргааш, +3d")
    p_add.add_argument("-t", "--tag", action="append", help="шошго (олон удаа өгч болно)")
    p_add.add_argument("-n", "--note", help="нэмэлт тэмдэглэл")
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="таскуудыг жагсаах")
    add_filter_flags(p_list)
    p_list.add_argument("--group", choices=["status", "priority"],
                        help="бүлэглэж харуулах")
    p_list.add_argument("-l", "--limit", type=int, help="хамгийн ихдээ N мөр")
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="нэг таскийн дэлгэрэнгүй")
    p_show.add_argument("id", type=int)
    p_show.set_defaults(func=cmd_show)

    for name, help_text, func in (
        ("done", "дууссан болгох", cmd_done),
        ("start", "хийж эхэлсэн болгох", cmd_start),
        ("reopen", "дахин нээх", cmd_reopen),
        ("cancel", "цуцлах", cmd_cancel),
    ):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("id", type=int, nargs="+")
        p.set_defaults(func=func)

    p_edit = sub.add_parser("edit", help="таск засах")
    p_edit.add_argument("id", type=int)
    p_edit.add_argument("--title", nargs="+", help="шинэ гарчиг")
    p_edit.add_argument("-p", "--priority")
    p_edit.add_argument("-s", "--status")
    p_edit.add_argument("-d", "--due")
    p_edit.add_argument("--clear-due", action="store_true", help="хугацааг арилгах")
    p_edit.add_argument("-n", "--note")
    p_edit.add_argument("-t", "--tag", action="append", help="шошгыг бүхэлд нь солих")
    p_edit.add_argument("--add-tag", action="append", help="шошго нэмэх")
    p_edit.add_argument("--rm-tag", action="append", help="шошго хасах")
    p_edit.set_defaults(func=cmd_edit)

    p_rm = sub.add_parser("rm", help="таск устгах")
    p_rm.add_argument("id", type=int, nargs="+")
    p_rm.add_argument("-y", "--yes", action="store_true", help="асуухгүй устгах")
    p_rm.set_defaults(func=cmd_rm)

    p_next = sub.add_parser("next", help="дараа нь хийх таскууд")
    p_next.add_argument("-c", "--count", type=int, default=3)
    p_next.set_defaults(func=cmd_next)

    p_search = sub.add_parser("search", help="түлхүүр үгээр хайх")
    p_search.add_argument("query", help="хайх үг")
    add_filter_flags(p_search)
    p_search.add_argument("--group", choices=["status", "priority"])
    p_search.add_argument("-l", "--limit", type=int)
    p_search.set_defaults(func=cmd_search)

    p_stats = sub.add_parser("stats", help="товч статистик")
    p_stats.set_defaults(func=cmd_stats)

    p_export = sub.add_parser("export", help="md / json / csv болгож гаргах")
    p_export.add_argument("-f", "--format", choices=["md", "json", "csv"], default="md")
    p_export.add_argument("-o", "--output", help="файл руу бичих")
    add_filter_flags(p_export)
    p_export.set_defaults(func=cmd_export)

    p_import = sub.add_parser("import", help="JSON файлаас оруулах")
    p_import.add_argument("file")
    p_import.add_argument("--duplicates", action="store_true",
                          help="давхардлыг шалгахгүй")
    p_import.set_defaults(func=cmd_import)

    p_purge = sub.add_parser("purge", help="хуучин хаагдсан таскуудыг устгах")
    p_purge.add_argument("--days", type=int, default=30,
                         help="хэдэн хоногоос хуучин (default: 30)")
    p_purge.add_argument("--dry-run", action="store_true", help="зөвхөн харуулах")
    p_purge.set_defaults(func=cmd_purge)

    p_path = sub.add_parser("path", help="өгөгдлийн файлын замыг хэвлэх")
    p_path.set_defaults(func=cmd_path)

    return parser


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)

    # Монгол нэртэй дэд командыг англи нэр рүү хөрвүүлнэ.
    for i, token in enumerate(argv):
        if token.startswith("-"):
            continue
        if token in COMMAND_ALIASES:
            argv[i] = COMMAND_ALIASES[token]
        break

    parser = build_parser()
    args = parser.parse_args(argv)

    Color.setup(sys.stdout)
    if getattr(args, "no_color", False):
        Color.enabled = False

    if not getattr(args, "command", None):
        parser.print_help()
        return 0

    args._path = store_path(args.store_file)
    try:
        store = load_store(args._path)
        return args.func(args, store)
    except TaskError as exc:
        print(Color.paint(f"Алдаа: {exc}", Color.RED), file=sys.stderr)
        return 1
    except FileNotFoundError as exc:
        print(Color.paint(f"Алдаа: файл олдсонгүй — {exc.filename}", Color.RED),
              file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nБолилоо.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
