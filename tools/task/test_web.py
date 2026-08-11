#!/usr/bin/env python3
"""web.py-ийн тестүүд — гол төлөв аюулгүй байдлын хязгаарлалтуудыг шалгана."""

import http.client
import json
import os
import sys
import tempfile
import threading
import unittest
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("TASK_WEB_QUIET", "1")

import task as core  # noqa: E402
import web  # noqa: E402

web.core = core


class WebTestCase(unittest.TestCase):
    read_only = False
    token = None

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = os.path.join(self.tmp.name, "tasks.json")

        self.server = web.create_server(self.path, port=0, token=self.token,
                                        read_only=self.read_only)
        self.port = self.server.server_address[1]
        self.csrf = self.server.config.csrf_token
        thread = threading.Thread(target=self.server.serve_forever, kwargs={'poll_interval': 0.02},
                                  daemon=True)
        thread.start()
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    def request(self, method, path, body=None, headers=None, host=None,
                with_csrf=True):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        head = {"Host": host or f"127.0.0.1:{self.port}"}
        if with_csrf:
            head["X-CSRF-Token"] = self.csrf
        if body is not None:
            body = json.dumps(body).encode("utf-8")
            head["Content-Type"] = "application/json"
        head.update(headers or {})
        try:
            conn.request(method, path, body=body, headers=head)
            response = conn.getresponse()
            payload = response.read().decode("utf-8")
            return response.status, dict(response.getheaders()), payload
        finally:
            conn.close()

    def json_request(self, *args, **kwargs):
        status, headers, payload = self.request(*args, **kwargs)
        return status, json.loads(payload) if payload else None

    def add(self, title, **fields):
        status, data = self.json_request(
            "POST", "/api/tasks", {"title": title, **fields})
        self.assertEqual(status, 201, data)
        return data

    def tasks(self):
        return core.load_store(self.path)["tasks"]


class TestPageAndAssets(WebTestCase):
    def test_index_contains_csrf_token(self):
        status, _, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(self.csrf, body)
        self.assertIn("Таск удирдлага", body)

    def test_static_assets_served(self):
        for path, marker in (("/app.css", "--accent"), ("/app.js", "X-CSRF-Token")):
            status, _, body = self.request("GET", path)
            self.assertEqual(status, 200, path)
            self.assertIn(marker, body)

    def test_security_headers_present(self):
        _, headers, _ = self.request("GET", "/")
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Referrer-Policy"], "no-referrer")
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_no_cors_headers(self):
        _, headers, _ = self.request("GET", "/api/state")
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_unknown_path_is_404(self):
        status, _, _ = self.request("GET", "/secrets")
        self.assertEqual(status, 404)

    def test_path_traversal_blocked(self):
        for path in ("/../task.py", "/webui/../task.py", "/app.js/../../task.py"):
            status, _, body = self.request("GET", path)
            self.assertEqual(status, 404, path)
            self.assertNotIn("def main", body)

    def test_options_and_put_rejected(self):
        self.assertEqual(self.request("OPTIONS", "/api/state")[0], 405)
        self.assertEqual(self.request("PUT", "/api/tasks/1")[0], 405)


class TestSecurityGuards(WebTestCase):
    def test_foreign_host_header_rejected(self):
        status, _, _ = self.request("GET", "/", host="evil.example.com")
        self.assertEqual(status, 403)

    def test_lan_ip_host_header_rejected(self):
        status, _, _ = self.request("GET", "/", host=f"192.168.1.10:{self.port}")
        self.assertEqual(status, 403)

    def test_localhost_host_header_allowed(self):
        status, _, _ = self.request("GET", "/", host=f"localhost:{self.port}")
        self.assertEqual(status, 200)

    def test_foreign_origin_rejected(self):
        status, _, _ = self.request("GET", "/api/state",
                                    headers={"Origin": "https://evil.example.com"})
        self.assertEqual(status, 403)

    def test_own_origin_allowed(self):
        status, _, _ = self.request(
            "GET", "/api/state",
            headers={"Origin": f"http://127.0.0.1:{self.port}"})
        self.assertEqual(status, 200)

    def test_cross_site_fetch_metadata_rejected(self):
        status, _, _ = self.request("POST", "/api/tasks", {"title": "х"},
                                    headers={"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(status, 403)
        self.assertEqual(self.tasks(), [])

    def test_mutation_without_csrf_rejected(self):
        status, data = self.json_request("POST", "/api/tasks", {"title": "х"},
                                         with_csrf=False)
        self.assertEqual(status, 403)
        self.assertIn("CSRF", data["error"])
        self.assertEqual(self.tasks(), [])

    def test_mutation_with_wrong_csrf_rejected(self):
        status, _ = self.json_request("POST", "/api/tasks", {"title": "х"},
                                      headers={"X-CSRF-Token": "wrong-token"})
        self.assertEqual(status, 403)
        self.assertEqual(self.tasks(), [])

    def test_reads_do_not_need_csrf(self):
        status, _, _ = self.request("GET", "/api/state", with_csrf=False)
        self.assertEqual(status, 200)

    def test_body_size_limit(self):
        status, data = self.json_request("POST", "/api/tasks",
                                         {"title": "x", "note": "н" * 70000})
        self.assertEqual(status, 413)

    def test_wrong_content_type_rejected(self):
        status, _, _ = self.request("POST", "/api/tasks", {"title": "х"},
                                    headers={"Content-Type": "text/plain"})
        self.assertEqual(status, 415)

    def test_invalid_json_rejected(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request("POST", "/api/tasks", body="{ буруу".encode("utf-8"),
                     headers={"Host": f"127.0.0.1:{self.port}",
                              "X-CSRF-Token": self.csrf,
                              "Content-Type": "application/json"})
        self.assertEqual(conn.getresponse().status, 400)
        conn.close()


class TestNonLoopbackBind(unittest.TestCase):
    def test_refuses_to_bind_public_interface(self):
        for host in ("0.0.0.0", "192.168.1.10", "::"):
            with self.assertRaises(core.TaskError) as ctx:
                web.create_server("/tmp/unused-tasks.json", host=host, port=0)
            self.assertIn("локал хаяг биш", str(ctx.exception))

    def test_loopback_detection(self):
        for host in ("127.0.0.1", "127.0.0.53", "localhost", "::1", "[::1]"):
            self.assertTrue(web.is_loopback(host), host)
        for host in ("0.0.0.0", "10.0.0.5", "192.168.0.1", "example.com", ""):
            self.assertFalse(web.is_loopback(host), host)


class TestTokenAuth(WebTestCase):
    token = "s3cret-local-token-123"

    def test_request_without_token_rejected(self):
        status, data = self.json_request("GET", "/api/state")
        self.assertEqual(status, 401)
        self.assertIn("Token", data["error"])

    def test_query_token_accepted_and_sets_cookie(self):
        status, headers, _ = self.request("GET", f"/?token={self.token}")
        self.assertEqual(status, 200)
        self.assertIn("task_token=", headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", headers["Set-Cookie"])
        self.assertIn("HttpOnly", headers["Set-Cookie"])

    def test_cookie_token_accepted(self):
        status, _, _ = self.request(
            "GET", "/api/state", headers={"Cookie": f"task_token={self.token}"})
        self.assertEqual(status, 200)

    def test_header_token_accepted(self):
        status, _, _ = self.request("GET", "/api/state",
                                    headers={"X-Task-Token": self.token})
        self.assertEqual(status, 200)

    def test_wrong_token_rejected(self):
        status, _, _ = self.request("GET", "/api/state",
                                    headers={"X-Task-Token": "wrong-token"})
        self.assertEqual(status, 401)


class TestReadOnly(WebTestCase):
    read_only = True

    def test_state_reports_read_only(self):
        status, data = self.json_request("GET", "/api/state")
        self.assertEqual(status, 200)
        self.assertTrue(data["readOnly"])

    def test_create_rejected(self):
        status, data = self.json_request("POST", "/api/tasks", {"title": "х"})
        self.assertEqual(status, 403)
        self.assertIn("унших", data["error"])

    def test_delete_rejected(self):
        core.save_store(self.path, {
            "version": 1, "next_id": 2,
            "tasks": [{"id": 1, "title": "х", "status": "todo", "priority": "med",
                       "tags": [], "due": None, "note": "",
                       "created": core.now_iso(), "updated": core.now_iso(),
                       "done_at": None}],
        })
        status, _ = self.json_request("DELETE", "/api/tasks/1")
        self.assertEqual(status, 403)
        self.assertEqual(len(self.tasks()), 1)


class TestApi(WebTestCase):
    def test_create_returns_state(self):
        data = self.add("Тайлан бичих", priority="high", due="маргааш",
                        tags=["ажил", "тайлан"])
        self.assertEqual(len(data["tasks"]), 1)
        task = self.tasks()[0]
        self.assertEqual(task["title"], "Тайлан бичих")
        self.assertEqual(task["priority"], "high")
        self.assertEqual(task["tags"], ["ажил", "тайлан"])
        self.assertIsNotNone(task["due"])

    def test_tags_accept_comma_string(self):
        self.add("Жишээ", tags="ажил, гэр")
        self.assertEqual(self.tasks()[0]["tags"], ["ажил", "гэр"])

    def test_empty_title_rejected(self):
        status, data = self.json_request("POST", "/api/tasks", {"title": "   "})
        self.assertEqual(status, 400)
        self.assertIn("Гарчиг", data["error"])

    def test_too_long_title_rejected(self):
        status, _ = self.json_request("POST", "/api/tasks", {"title": "х" * 600})
        self.assertEqual(status, 400)

    def test_bad_priority_rejected(self):
        status, data = self.json_request("POST", "/api/tasks",
                                         {"title": "х", "priority": "хэт-өндөр"})
        self.assertEqual(status, 400)
        self.assertIn("ач холбогдол", data["error"])

    def test_bad_due_rejected(self):
        status, _ = self.json_request("POST", "/api/tasks",
                                      {"title": "х", "due": "хэзээ нэгэн цагт"})
        self.assertEqual(status, 400)

    def test_patch_status_sets_done_at(self):
        self.add("Жишээ")
        status, _ = self.json_request("PATCH", "/api/tasks/1", {"status": "done"})
        self.assertEqual(status, 200)
        self.assertEqual(self.tasks()[0]["status"], "done")
        self.assertIsNotNone(self.tasks()[0]["done_at"])

    def test_patch_clears_due_with_empty_string(self):
        self.add("Жишээ", due="маргааш")
        self.json_request("PATCH", "/api/tasks/1", {"due": ""})
        self.assertIsNone(self.tasks()[0]["due"])

    def test_patch_unknown_id_is_400(self):
        status, data = self.json_request("PATCH", "/api/tasks/99", {"title": "х"})
        self.assertEqual(status, 400)
        self.assertIn("олдсонгүй", data["error"])

    def test_delete_removes_task(self):
        self.add("Жишээ")
        status, _ = self.json_request("DELETE", "/api/tasks/1")
        self.assertEqual(status, 200)
        self.assertEqual(self.tasks(), [])

    def test_views_filter_tasks(self):
        self.add("өнөөдөр", due="өнөөдөр")
        self.add("хол", due="+30d")
        self.add("дууссан")
        self.json_request("PATCH", "/api/tasks/3", {"status": "done"})

        def titles(view):
            _, data = self.json_request("GET", f"/api/state?view={view}")
            return [t["title"] for t in data["tasks"]]

        self.assertEqual(titles("today"), ["өнөөдөр"])
        self.assertEqual(sorted(titles("open")), ["хол", "өнөөдөр"])
        self.assertEqual(titles("done"), ["дууссан"])
        self.assertEqual(len(titles("all")), 3)

    def test_unknown_view_is_400(self):
        status, _ = self.json_request("GET", "/api/state?view=" + quote("байхгүй"))
        self.assertEqual(status, 400)

    def test_search_and_tag_filters(self):
        self.add("Тайлан бичих", tags=["ажил"])
        self.add("Ном унших", tags=["хувийн"])
        _, data = self.json_request("GET", "/api/state?q=" + quote("ном"))
        self.assertEqual([t["title"] for t in data["tasks"]], ["Ном унших"])
        _, data = self.json_request("GET", "/api/state?tag=" + quote("ажил"))
        self.assertEqual([t["title"] for t in data["tasks"]], ["Тайлан бичих"])

    def test_counts_and_overdue_flag(self):
        self.add("хоцорсон", due="2020-01-01")
        _, data = self.json_request("GET", "/api/state")
        self.assertEqual(data["counts"]["overdue"], 1)
        self.assertTrue(data["tasks"][0]["overdue"])
        self.assertLess(data["tasks"][0]["days_left"], 0)

    def test_export_endpoint(self):
        self.add("Тайлан бичих")
        status, headers, body = self.request("GET", "/api/export?format=md")
        self.assertEqual(status, 200)
        self.assertIn("attachment", headers["Content-Disposition"])
        self.assertIn("Тайлан бичих", body)

        status, _, body = self.request("GET", "/api/export?format=csv")
        self.assertIn("id,title,status", body)
        self.assertEqual(self.request("GET", "/api/export?format=exe")[0], 400)

    def test_cli_and_web_share_the_same_file(self):
        self.add("Вэбээс нэмсэн")
        os.environ["TASK_FILE"] = self.path
        self.addCleanup(os.environ.pop, "TASK_FILE", None)
        core.main(["add", "CLI-ээс нэмсэн"])
        _, data = self.json_request("GET", "/api/state")
        self.assertEqual(sorted(t["title"] for t in data["tasks"]),
                         ["CLI-ээс нэмсэн", "Вэбээс нэмсэн"])

    def test_concurrent_creates_keep_unique_ids(self):
        def worker(index):
            self.json_request("POST", "/api/tasks", {"title": f"таск-{index}"})

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(12)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        ids = [t["id"] for t in self.tasks()]
        self.assertEqual(len(ids), 12)
        self.assertEqual(len(set(ids)), 12)


if __name__ == "__main__":
    unittest.main()
