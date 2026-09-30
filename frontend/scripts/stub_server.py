#!/usr/bin/env python3
"""E2E 桩后端：给 frontend/dist 提供静态服务，并实现与 server/app.py 相同的 7 个接口。

仅用于本地验证（不是生产服务）：状态存 JSON 文件，可选故障开关，并记录最后一次收到的
/api/import 载荷，便于断言「前端到底往服务端发了什么」。

用法:
  python3 scripts/stub_server.py --dist dist --port 8098 --state /tmp/fitness-e2e/state.json

控制面（仅供测试脚本调用）:
  GET  /__ctl?export_status=500&me_status=401&import_status=500&export_delay=1.0
  GET  /__ctl/reset
  GET  /__last_import        → 最后一次 /api/import 收到的原始载荷
  GET  /__imports            → 收到过的所有载荷（数组）
  POST /__state              → 直接写服务端状态（模拟「远端有本地没有的数据」）
"""
from __future__ import annotations

import argparse
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ARGS = None
CTL = {"export_status": 200, "me_status": 200, "import_status": 200, "export_delay": 0.0, "me_delay": 0.0}
STATE = {"w": [], "f": [], "bw": []}
IMPORTS: list[dict] = []
SESSIONS: dict[str, str] = {}


def load_state() -> None:
    global STATE
    if ARGS.state and os.path.exists(ARGS.state):
        with open(ARGS.state) as fh:
            STATE = json.load(fh)


def save_state() -> None:
    if not ARGS.state:
        return
    os.makedirs(os.path.dirname(ARGS.state), exist_ok=True)
    with open(ARGS.state, "w") as fh:
        json.dump(STATE, fh)


class Handler(BaseHTTPRequestHandler):
    server_version = "FitnessStub/1.0"

    def log_message(self, fmt, *args):  # 安静
        pass

    # ---- helpers ----
    def _json(self, obj, code=200, cookie=None, clear=False):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", f"ftsess={cookie}; HttpOnly; Path=/; SameSite=Lax")
        if clear:
            self.send_header("Set-Cookie", "ftsess=deleted; HttpOnly; Path=/; SameSite=Lax; Max-Age=0")
        self.end_headers()
        self.wfile.write(body)

    def _cookie(self) -> str:
        for part in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "ftsess":
                return v
        return ""

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return {}

    def _static(self, path: str) -> None:
        rel = path.lstrip("/") or "index.html"
        full = os.path.join(ARGS.dist, rel)
        if not os.path.isfile(full):
            full = os.path.join(ARGS.dist, "index.html")  # SPA fallback
        try:
            with open(full, "rb") as fh:
                body = fh.read()
        except OSError:
            self.send_response(404)
            self.end_headers()
            return
        ctype = "text/html; charset=utf-8"
        if full.endswith(".js"):
            ctype = "text/javascript"
        elif full.endswith(".css"):
            ctype = "text/css"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ---- control plane ----
    def _ctl(self, path: str, query: dict) -> None:
        if path == "/__ctl/reset":
            CTL.update(export_status=200, me_status=200, import_status=200, export_delay=0.0, me_delay=0.0)
            IMPORTS.clear()
            self._json({"ok": True, "ctl": CTL})
            return
        if path == "/__ctl":
            for k in ("export_status", "me_status", "import_status"):
                if k in query:
                    CTL[k] = int(query[k][0])
            if "export_delay" in query:
                CTL["export_delay"] = float(query["export_delay"][0])
            if "me_delay" in query:
                CTL["me_delay"] = float(query["me_delay"][0])
            self._json({"ok": True, "ctl": CTL})
            return
        if path == "/__last_import":
            self._json(IMPORTS[-1] if IMPORTS else None)
            return
        if path == "/__imports":
            self._json(IMPORTS)
            return
        self._json({"error": "not found"}, 404)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith("/__"):
            self._ctl(u.path, parse_qs(u.query))
            return
        if u.path == "/api/me":
            if CTL["me_delay"]:
                time.sleep(CTL["me_delay"])
            if CTL["me_status"] != 200:
                self._json({"error": "unauthorized"}, CTL["me_status"])
                return
            who = SESSIONS.get(self._cookie())
            self._json({"user": who} if who else {"error": "unauthorized"}, 200 if who else 401)
            return
        if u.path == "/api/export":
            if CTL["export_status"] != 200:
                self._json({"error": "boom"}, CTL["export_status"])
                return
            if CTL["export_delay"]:
                time.sleep(CTL["export_delay"])
            if not SESSIONS.get(self._cookie()):
                self._json({"error": "unauthorized"}, 401)
                return
            self._json(STATE)
            return
        self._static(u.path)

    def do_POST(self):
        u = urlparse(self.path)
        data = self._body()
        if u.path == "/__state":
            global STATE
            STATE = {"w": data.get("w") or [], "f": data.get("f") or [], "bw": data.get("bw") or []}
            save_state()
            self._json({"ok": True, "w": len(STATE["w"]), "f": len(STATE["f"]), "bw": len(STATE["bw"])})
            return
        if u.path == "/api/login":
            if not data.get("username") or not data.get("password"):
                self._json({"error": "bad credentials"}, 401)
                return
            tok = "tok-" + str(len(SESSIONS) + 1)
            SESSIONS[tok] = str(data["username"])
            self._json({"user": data["username"]}, cookie=tok)
            return
        if u.path == "/api/register":
            if data.get("username") == "taken":
                self._json({"error": "user exists"}, 409)
                return
            if data.get("username") == "closed":
                self._json({"error": "registration closed"}, 403)
                return
            tok = "tok-" + str(len(SESSIONS) + 1)
            SESSIONS[tok] = str(data["username"])
            self._json({"user": data["username"]}, cookie=tok)
            return
        if u.path == "/api/logout":
            SESSIONS.pop(self._cookie(), None)
            self._json({"ok": True}, clear=True)
            return
        if u.path == "/api/import":
            if CTL["import_status"] != 200:
                self._json({"error": "boom"}, CTL["import_status"])
                return
            if not SESSIONS.get(self._cookie()):
                self._json({"error": "unauthorized"}, 401)
                return
            IMPORTS.append(data)
            STATE = {"w": data.get("w") or [], "f": data.get("f") or [], "bw": data.get("bw") or []}
            save_state()
            self._json({"ok": True, "w": len(STATE["w"]), "f": len(STATE["f"]), "bw": len(STATE["bw"])})
            return
        self._json({"error": "not found"}, 404)


def main() -> None:
    global ARGS
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", default="dist")
    ap.add_argument("--port", type=int, default=8098)
    ap.add_argument("--state", default="")
    ARGS = ap.parse_args()
    load_state()
    srv = ThreadingHTTPServer(("127.0.0.1", ARGS.port), Handler)
    print(f"stub serving {ARGS.dist} on http://127.0.0.1:{ARGS.port} state={ARGS.state or '-'}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
