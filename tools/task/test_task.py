#!/usr/bin/env python3
"""task.py-ийн тестүүд:  python3 -m unittest discover tools/task"""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import task as t  # noqa: E402


class TaskTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "tasks.json")
        os.environ["TASK_FILE"] = self.path
        t.Color.enabled = False
        self.addCleanup(self.tmp.cleanup)
        self.addCleanup(os.environ.pop, "TASK_FILE", None)

    def run_cli(self, *argv):
        """CLI-г дуудаж (гаралт, exit code)-г буцаана."""
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = t.main(list(argv))
        return buf.getvalue(), code

    def store(self):
        return t.load_store(self.path)

    def tasks(self):
        return self.store()["tasks"]


class TestAdd(TaskTestCase):
    def test_add_creates_task_with_defaults(self):
        out, code = self.run_cli("add", "Тайлан", "бичих")
        self.assertEqual(code, 0)
        self.assertIn("Нэмэгдлээ", out)

        tasks = self.tasks()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["title"], "Тайлан бичих")
        self.assertEqual(tasks[0]["status"], "todo")
        self.assertEqual(tasks[0]["priority"], "med")
        self.assertIsNone(tasks[0]["due"])
        self.assertEqual(tasks[0]["id"], 1)

    def test_add_with_all_fields(self):
        self.run_cli("add", "Уулзалт", "-p", "urgent", "-d", "2026-08-20",
                     "-t", "ажил,яаралтай", "-n", "10:00 цагт")
        task = self.tasks()[0]
        self.assertEqual(task["priority"], "urgent")
        self.assertEqual(task["due"], "2026-08-20")
        self.assertEqual(task["tags"], ["ажил", "яаралтай"])
        self.assertEqual(task["note"], "10:00 цагт")

    def test_ids_increment_and_survive_deletion(self):
        self.run_cli("add", "нэг")
        self.run_cli("add", "хоёр")
        self.run_cli("rm", "1", "-y")
        self.run_cli("add", "гурав")
        self.assertEqual([x["id"] for x in self.tasks()], [2, 3])

    def test_mongolian_command_alias(self):
        self.run_cli("нэм", "Монгол", "нэрээр")
        self.assertEqual(self.tasks()[0]["title"], "Монгол нэрээр")

    def test_bad_priority_reports_error(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = t.main(["add", "жишээ", "-p", "хэт-өндөр"])
        self.assertEqual(code, 1)


class TestStatus(TaskTestCase):
    def setUp(self):
        super().setUp()
        self.run_cli("add", "нэг")
        self.run_cli("add", "хоёр")

    def test_done_sets_timestamp(self):
        self.run_cli("done", "1")
        task = self.tasks()[0]
        self.assertEqual(task["status"], "done")
        self.assertIsNotNone(task["done_at"])

    def test_done_accepts_multiple_ids(self):
        self.run_cli("done", "1", "2")
        self.assertTrue(all(x["status"] == "done" for x in self.tasks()))

    def test_reopen_clears_done_at(self):
        self.run_cli("done", "1")
        self.run_cli("reopen", "1")
        task = self.tasks()[0]
        self.assertEqual(task["status"], "todo")
        self.assertIsNone(task["done_at"])

    def test_start_and_cancel(self):
        self.run_cli("start", "1")
        self.run_cli("cancel", "2")
        self.assertEqual(self.tasks()[0]["status"], "doing")
        self.assertEqual(self.tasks()[1]["status"], "cancelled")

    def test_unknown_id_errors(self):
        _, code = self.run_cli("done", "99")
        self.assertEqual(code, 1)


class TestEdit(TaskTestCase):
    def setUp(self):
        super().setUp()
        self.run_cli("add", "Хуучин", "-t", "ажил", "-d", "2026-09-01")

    def test_edit_title_and_priority(self):
        self.run_cli("edit", "1", "--title", "Шинэ", "нэр", "-p", "high")
        task = self.tasks()[0]
        self.assertEqual(task["title"], "Шинэ нэр")
        self.assertEqual(task["priority"], "high")

    def test_clear_due(self):
        self.run_cli("edit", "1", "--clear-due")
        self.assertIsNone(self.tasks()[0]["due"])

    def test_add_and_remove_tags(self):
        self.run_cli("edit", "1", "--add-tag", "гэр", "--add-tag", "ажил")
        self.assertEqual(self.tasks()[0]["tags"], ["ажил", "гэр"])
        self.run_cli("edit", "1", "--rm-tag", "ажил")
        self.assertEqual(self.tasks()[0]["tags"], ["гэр"])

    def test_edit_without_flags_errors(self):
        _, code = self.run_cli("edit", "1")
        self.assertEqual(code, 1)


class TestParsing(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 8, 11)

    def test_relative_dates(self):
        self.assertEqual(t.parse_date("өнөөдөр", self.today), "2026-08-11")
        self.assertEqual(t.parse_date("маргааш", self.today), "2026-08-12")
        self.assertEqual(t.parse_date("+3d", self.today), "2026-08-14")
        self.assertEqual(t.parse_date("2w", self.today), "2026-08-25")
        self.assertEqual(t.parse_date("5", self.today), "2026-08-16")

    def test_absolute_dates(self):
        self.assertEqual(t.parse_date("2026-12-01", self.today), "2026-12-01")
        self.assertEqual(t.parse_date("09-15", self.today), "2026-09-15")

    def test_short_date_rolls_to_next_year(self):
        # 6 сараас илүү өнгөрсөн богино огноо дараа жил рүү шилжинэ.
        self.assertEqual(t.parse_date("01-05", self.today), "2027-01-05")

    def test_invalid_date(self):
        with self.assertRaises(t.TaskError):
            t.parse_date("хэзээ нэгэн цагт", self.today)

    def test_priority_aliases(self):
        self.assertEqual(t.parse_priority("H"), "high")
        self.assertEqual(t.parse_priority("яаралтай"), "urgent")
        self.assertEqual(t.parse_priority("medium"), "med")

    def test_tags_are_normalised(self):
        self.assertEqual(t.parse_tags(["#Ажил, гэр", "ажил"]), ["ажил", "гэр"])


class TestListFilters(TaskTestCase):
    def setUp(self):
        super().setUp()
        today = date.today()
        self.run_cli("add", "хоцорсон", "-d", (today - timedelta(days=2)).isoformat(),
                     "-p", "high", "-t", "ажил")
        self.run_cli("add", "өнөөдөр", "-d", today.isoformat(), "-t", "гэр")
        self.run_cli("add", "дараа сар", "-d", (today + timedelta(days=20)).isoformat())
        self.run_cli("add", "хугацаагүй", "-p", "low")
        self.run_cli("add", "дууссан")
        self.run_cli("done", "5")

    def titles(self, *argv):
        out, code = self.run_cli(*argv)
        self.assertEqual(code, 0)
        return out

    def test_default_hides_closed(self):
        out = self.titles("list")
        self.assertNotIn("дууссан", out)
        self.assertIn("хугацаагүй", out)

    def test_all_shows_closed(self):
        self.assertIn("дууссан", self.titles("list", "-a"))

    def test_filter_overdue(self):
        out = self.titles("list", "--due", "overdue")
        self.assertIn("хоцорсон", out)
        self.assertNotIn("дараа сар", out)

    def test_filter_week(self):
        out = self.titles("list", "--due", "week")
        self.assertIn("өнөөдөр", out)
        self.assertNotIn("дараа сар", out)

    def test_filter_by_tag_and_priority(self):
        self.assertIn("хоцорсон", self.titles("list", "-t", "ажил"))
        self.assertIn("хугацаагүй", self.titles("list", "-p", "low"))

    def test_filter_due_none(self):
        out = self.titles("list", "--due", "none")
        self.assertIn("хугацаагүй", out)
        self.assertNotIn("өнөөдөр", out)

    def test_limit(self):
        out = self.titles("list", "-l", "1")
        self.assertIn("Нийт 1 таск", out)

    def test_search_matches_note_and_title(self):
        self.run_cli("add", "Огт өөр", "-n", "нууц үг сэргээх")
        self.assertIn("Огт өөр", self.titles("search", "нууц"))

    def test_group_by_status(self):
        out = self.titles("list", "-a", "--group", "status")
        self.assertIn("ХҮЛЭЭГДЭЖ БУЙ", out)
        self.assertIn("ДУУССАН", out)


class TestSortOrder(TaskTestCase):
    def test_open_urgent_overdue_first(self):
        today = date.today()
        self.run_cli("add", "бага ач холбогдол", "-p", "low")
        self.run_cli("add", "яаралтай", "-p", "urgent")
        self.run_cli("add", "яаралтай ба хоцорсон", "-p", "urgent",
                     "-d", (today - timedelta(days=1)).isoformat())
        ordered = sorted(self.tasks(), key=t.sort_key)
        self.assertEqual(ordered[0]["title"], "яаралтай ба хоцорсон")
        self.assertEqual(ordered[-1]["title"], "бага ач холбогдол")

    def test_next_shows_top_items(self):
        self.run_cli("add", "нэг", "-p", "low")
        self.run_cli("add", "хоёр", "-p", "urgent")
        out, _ = self.run_cli("next", "-c", "1")
        self.assertIn("хоёр", out)
        self.assertNotIn("нэг", out)

    def test_next_with_no_open_tasks(self):
        self.run_cli("add", "нэг")
        self.run_cli("done", "1")
        out, _ = self.run_cli("next")
        self.assertIn("Нээлттэй таск байхгүй", out)


class TestExportImport(TaskTestCase):
    def setUp(self):
        super().setUp()
        self.run_cli("add", "Эхний", "-p", "high", "-d", "2026-08-20", "-t", "ажил")
        self.run_cli("add", "Хоёрдугаар")
        self.run_cli("done", "2")

    def test_export_markdown(self):
        out, code = self.run_cli("export", "-a")
        self.assertEqual(code, 0)
        self.assertIn("- [ ] **#1** Эхний", out)
        self.assertIn("- [x] **#2** Хоёрдугаар", out)

    def test_export_csv(self):
        out, _ = self.run_cli("export", "-f", "csv", "-a")
        self.assertIn("id,title,status", out)
        self.assertIn("Эхний", out)

    def test_export_json_roundtrip(self):
        out, _ = self.run_cli("export", "-f", "json", "-a")
        data = json.loads(out)
        self.assertEqual(len(data), 2)

    def test_export_to_file(self):
        target = os.path.join(os.path.dirname(self.path), "out.md")
        self.run_cli("export", "-o", target, "-a")
        with open(target, encoding="utf-8") as fh:
            self.assertIn("Эхний", fh.read())

    def test_import_skips_duplicates(self):
        source = os.path.join(os.path.dirname(self.path), "in.json")
        with open(source, "w", encoding="utf-8") as fh:
            json.dump([
                {"title": "Эхний", "status": "todo"},
                {"title": "Шинэ", "priority": "high", "due": "2026-10-01"},
            ], fh, ensure_ascii=False)
        out, code = self.run_cli("import", source)
        self.assertEqual(code, 0)
        self.assertIn("1 таск нэмэгдлээ", out)
        titles = [x["title"] for x in self.tasks()]
        self.assertEqual(titles.count("Эхний"), 1)
        self.assertIn("Шинэ", titles)

    def test_import_allows_duplicates_with_flag(self):
        source = os.path.join(os.path.dirname(self.path), "in.json")
        with open(source, "w", encoding="utf-8") as fh:
            json.dump([{"title": "Эхний"}], fh, ensure_ascii=False)
        self.run_cli("import", source, "--duplicates")
        titles = [x["title"] for x in self.tasks()]
        self.assertEqual(titles.count("Эхний"), 2)


class TestPurgeAndStats(TaskTestCase):
    def test_purge_removes_only_old_closed(self):
        self.run_cli("add", "хуучин")
        self.run_cli("add", "шинэ")
        self.run_cli("add", "нээлттэй")
        self.run_cli("done", "1")
        self.run_cli("done", "2")

        store = self.store()
        old = (date.today() - timedelta(days=90)).isoformat() + "T09:00:00"
        store["tasks"][0]["done_at"] = old
        t.save_store(self.path, store)

        out, _ = self.run_cli("purge", "--days", "30")
        self.assertIn("1 хаагдсан таск устгав", out)
        self.assertEqual([x["title"] for x in self.tasks()], ["шинэ", "нээлттэй"])

    def test_purge_dry_run_keeps_everything(self):
        self.run_cli("add", "нэг")
        self.run_cli("done", "1")
        store = self.store()
        store["tasks"][0]["done_at"] = (
            date.today() - timedelta(days=90)).isoformat() + "T09:00:00"
        t.save_store(self.path, store)
        self.run_cli("purge", "--days", "30", "--dry-run")
        self.assertEqual(len(self.tasks()), 1)

    def test_stats_counts(self):
        self.run_cli("add", "нэг", "-p", "urgent", "-t", "ажил")
        self.run_cli("add", "хоёр")
        self.run_cli("done", "2")
        out, code = self.run_cli("stats")
        self.assertEqual(code, 0)
        self.assertIn("Нийт 2 таск", out)
        self.assertIn("гүйцэтгэл 50%", out)

    def test_stats_on_empty_store(self):
        out, code = self.run_cli("stats")
        self.assertEqual(code, 0)
        self.assertIn("Нийт 0 таск", out)


class TestStorage(TaskTestCase):
    def test_missing_file_starts_empty(self):
        out, code = self.run_cli("list")
        self.assertEqual(code, 0)
        self.assertIn("Тохирох таск алга", out)

    def test_corrupt_file_reports_error(self):
        with open(self.path, "w", encoding="utf-8") as fh:
            fh.write("{ энэ бол JSON биш")
        _, code = self.run_cli("list")
        self.assertEqual(code, 1)

    def test_save_is_atomic_and_leaves_no_temp_files(self):
        self.run_cli("add", "нэг")
        leftovers = [f for f in os.listdir(os.path.dirname(self.path))
                     if f.endswith(".tmp")]
        self.assertEqual(leftovers, [])

    def test_file_is_created_in_missing_directory(self):
        nested = os.path.join(os.path.dirname(self.path), "a", "b", "tasks.json")
        os.environ["TASK_FILE"] = nested
        self.run_cli("add", "нэг")
        self.assertTrue(os.path.exists(nested))

    def test_next_id_recovered_from_tasks(self):
        with open(self.path, "w", encoding="utf-8") as fh:
            json.dump({"tasks": [{"id": 7, "title": "х", "status": "todo",
                                  "priority": "med", "tags": [], "due": None,
                                  "note": "", "created": t.now_iso(),
                                  "updated": t.now_iso(), "done_at": None}]}, fh)
        self.run_cli("add", "шинэ")
        self.assertEqual(self.tasks()[-1]["id"], 8)

    def test_path_command(self):
        out, _ = self.run_cli("path")
        self.assertEqual(out.strip(), self.path)

    def test_file_flag_overrides_env(self):
        other = os.path.join(os.path.dirname(self.path), "other.json")
        self.run_cli("--file", other, "add", "тусдаа")
        self.assertTrue(os.path.exists(other))
        self.assertEqual(self.tasks(), [])


if __name__ == "__main__":
    unittest.main()
