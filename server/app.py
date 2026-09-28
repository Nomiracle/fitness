#!/usr/bin/env python3
"""增肌记录后端: stdlib HTTP + SQLAlchemy + bcrypt, 单文件零框架依赖.

环境变量:
  FITNESS_MYSQL_HOST / PORT / DB / USER / PASSWORD   Mariadb 连接信息
  FITNESS_ALLOW_REGISTER  1=开放注册, 默认0 (首个用户建号不受限, 之后关闭)
  FITNESS_SESSION_DAYS    session 有效天数, 默认30
  FITNESS_PORT            监听端口, 默认8971
表全部 ft_ 前缀, 与 aresbotv4 无交叉.
"""
import json
import os
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote_plus, urlparse

import bcrypt
from sqlalchemy import (BigInteger, Column, Float, ForeignKey, Integer, String,
                        UniqueConstraint, create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker

MYSQL_HOST = os.environ.get("FITNESS_MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = os.environ.get("FITNESS_MYSQL_PORT", "3306")
MYSQL_DB = os.environ.get("FITNESS_MYSQL_DB", "fitness")
MYSQL_USER = os.environ.get("FITNESS_MYSQL_USER", "fitness_app")
MYSQL_PASSWORD = os.environ.get("FITNESS_MYSQL_PASSWORD", "")
ALLOW_REGISTER = os.environ.get("FITNESS_ALLOW_REGISTER", "0") == "1"
SESSION_DAYS = int(os.environ.get("FITNESS_SESSION_DAYS", "30"))
PORT = int(os.environ.get("FITNESS_PORT", "8971"))
BIND = os.environ.get("FITNESS_BIND", "127.0.0.1")
FRONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "index.html")

DB_URL = (f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}"
          f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4")
engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "ft_users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False)
    pw_hash = Column(String(128), nullable=False)
    created_at = Column(Integer, default=lambda: int(time.time()))


class LoginSession(Base):
    __tablename__ = "ft_sessions"
    token = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("ft_users.id"), nullable=False)
    expires_at = Column(Integer, nullable=False)


class Workout(Base):
    __tablename__ = "ft_workouts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("ft_users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    exercise = Column(String(128), nullable=False)
    duration_min = Column(Integer, default=0)
    start_ts = Column(BigInteger, nullable=True)
    end_ts = Column(BigInteger, nullable=True)
    pause_ms = Column(BigInteger, nullable=True)
    created_at = Column(BigInteger, default=0)


class WorkoutSet(Base):
    __tablename__ = "ft_sets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    workout_id = Column(Integer, ForeignKey("ft_workouts.id"), nullable=False)
    set_no = Column(Integer, nullable=False)
    weight_kg = Column(Float, default=0)
    reps = Column(Integer, default=0)


class FoodLog(Base):
    __tablename__ = "ft_foods"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("ft_users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    meal = Column(String(32), default="")
    name = Column(String(256), default="")
    kcal = Column(Float, default=0)
    protein = Column(Float, default=0)
    carbs = Column(Float, default=0)
    fat = Column(Float, default=0)
    created_at = Column(BigInteger, default=0)


class BodyMetric(Base):
    __tablename__ = "ft_body"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("ft_users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    weight_kg = Column(Float, nullable=False)
    note = Column(String(256), default="")
    created_at = Column(BigInteger, default=0)
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_body_user_date"),)


Base.metadata.create_all(engine)


def migrate_schema():
    """幂等补列: create_all 只建表不改表, 旧库需要显式 ALTER."""
    from sqlalchemy import text
    stmts = [
        "ALTER TABLE ft_workouts ADD COLUMN IF NOT EXISTS start_ts BIGINT NULL",
        "ALTER TABLE ft_workouts ADD COLUMN IF NOT EXISTS end_ts BIGINT NULL",
        "ALTER TABLE ft_workouts ADD COLUMN IF NOT EXISTS pause_ms BIGINT NULL",
    ]
    with engine.begin() as conn:
        for s in stmts:
            conn.execute(text(s))
    print("schema ok: ft_workouts.start_ts/end_ts/pause_ms", flush=True)


try:
    migrate_schema()
except Exception as exc:  # 迁移失败不阻塞启动, 记日志继续
    print(f"WARN migrate_schema failed: {exc}", flush=True)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def sstr(v, n=256):
    return str(v or "")[:n]


def sfloat(v):
    try:
        return max(0.0, min(100000.0, float(v)))
    except (TypeError, ValueError):
        return 0.0


def sopt(v):
    """可选毫秒时间戳: 空/0/非法 -> None(而不是 0), 便于前端区分"无计时"."""
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def sint(v):
    try:
        return max(0, min(9999999999999, int(float(v))))
    except (TypeError, ValueError):
        return 0


class Handler(BaseHTTPRequestHandler):
    server_version = "FitBulk/1.0"

    def log_message(self, fmt, *args):  # 安静日志, 只留错误
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    # ---- helpers ----
    def _json(self, obj, code=200, cookie=None, clear_cookie=False):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie",
                             f"ftsess={cookie}; HttpOnly; Path=/; SameSite=Lax; "
                             f"Max-Age={SESSION_DAYS * 86400}")
        if clear_cookie:
            self.send_header("Set-Cookie",
                             "ftsess=deleted; HttpOnly; Path=/; SameSite=Lax; Max-Age=0")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n <= 0 or n > 2 * 1024 * 1024:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, OSError):
            return {}

    def _me(self):
        ck = self.headers.get("Cookie") or ""
        m = re.search(r"(?:^|;\s*)ftsess=([A-Za-z0-9]+)", ck)
        if not m:
            return None
        db = SessionLocal()
        try:
            s = db.get(LoginSession, m.group(1))
            if not s or s.expires_at < int(time.time()):
                return None
            u = db.get(User, s.user_id)
            return {"id": u.id, "username": u.username} if u else None
        finally:
            db.close()

    # ---- routes ----
    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            try:
                with open(FRONT, "rb") as f:
                    body = f.read()
            except OSError:
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/me":
            me = self._me()
            self._json({"user": me["username"] if me else None},
                       200 if me else 401)
            return
        if path == "/api/export":
            me = self._me()
            if not me:
                self._json({"error": "unauthorized"}, 401)
                return
            db = SessionLocal()
            try:
                ws = db.query(Workout).filter_by(user_id=me["id"]).order_by(
                    Workout.date.desc(), Workout.id.desc()).limit(2000).all()
                wid = [w.id for w in ws]
                sets = db.query(WorkoutSet).filter(
                    WorkoutSet.workout_id.in_(wid)).all() if wid else []
                by_w = {}
                for st in sets:
                    by_w.setdefault(st.workout_id, []).append(st)
                w = [{"d": x.date, "ex": x.exercise,
                      "sets": [{"w": s.weight_kg, "r": s.reps}
                               for s in sorted(by_w.get(x.id, []),
                                               key=lambda s: s.set_no)],
                      "dur": x.duration_min or 0,
                      "st": x.start_ts, "et": x.end_ts,
                      "pause": x.pause_ms or 0,
                      "ts": x.created_at or 0} for x in ws]
                f = [{"d": x.date, "m": x.meal, "n": x.name, "k": x.kcal,
                      "p": x.protein, "c": x.carbs, "f": x.fat,
                      "ts": x.created_at or 0}
                     for x in db.query(FoodLog).filter_by(
                         user_id=me["id"]).order_by(
                         FoodLog.date.desc(), FoodLog.id.desc()).limit(2000)]
                bw = [{"d": x.date, "kg": x.weight_kg, "note": x.note or "",
                       "ts": x.created_at or 0}
                      for x in db.query(BodyMetric).filter_by(
                          user_id=me["id"]).order_by(BodyMetric.date).limit(2000)]
                self._json({"w": w, "f": f, "bw": bw})
            finally:
                db.close()
            return
        self._json({"error": "not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        data = self._body()
        if path == "/api/register":
            name = sstr(data.get("username"), 64).strip()
            pw = str(data.get("password") or "")
            if not re.match(r"^[\w\-@.]{2,64}$", name) or not 4 <= len(pw) <= 128:
                self._json({"error": "bad username/password"}, 400)
                return
            db = SessionLocal()
            try:
                if db.query(User).count() > 0 and not ALLOW_REGISTER:
                    self._json({"error": "registration closed"}, 403)
                    return
                if db.query(User).filter_by(username=name).first():
                    self._json({"error": "user exists"}, 409)
                    return
                u = User(username=name,
                         pw_hash=bcrypt.hashpw(pw.encode(),
                                               bcrypt.gensalt()).decode())
                db.add(u)
                db.commit()
                tok = secrets.token_hex(32)
                db.add(LoginSession(token=tok, user_id=u.id,
                                    expires_at=int(time.time()) + SESSION_DAYS * 86400))
                db.commit()
                self._json({"user": name}, 200, cookie=tok)
            finally:
                db.close()
            return
        if path == "/api/login":
            name = sstr(data.get("username"), 64).strip()
            pw = str(data.get("password") or "")
            db = SessionLocal()
            try:
                u = db.query(User).filter_by(username=name).first()
                if not u or not bcrypt.checkpw(pw.encode(), u.pw_hash.encode()):
                    self._json({"error": "bad credentials"}, 401)
                    return
                tok = secrets.token_hex(32)
                db.add(LoginSession(token=tok, user_id=u.id,
                                    expires_at=int(time.time()) + SESSION_DAYS * 86400))
                db.commit()
                self._json({"user": name}, 200, cookie=tok)
            finally:
                db.close()
            return
        if path == "/api/logout":
            me = self._me()
            if me:
                ck = self.headers.get("Cookie") or ""
                m = re.search(r"(?:^|;\s*)ftsess=([A-Za-z0-9]+)", ck)
                db = SessionLocal()
                try:
                    if m:
                        db.query(LoginSession).filter_by(token=m.group(1)).delete()
                        db.commit()
                finally:
                    db.close()
            self._json({"ok": True}, 200, clear_cookie=True)
            return
        if path == "/api/import":
            me = self._me()
            if not me:
                self._json({"error": "unauthorized"}, 401)
                return
            w = data.get("w") or []
            f = data.get("f") or []
            bw = data.get("bw") or []
            if not isinstance(w, list) or not isinstance(f, list) \
                    or not isinstance(bw, list) or len(w) + len(f) + len(bw) > 6000:
                self._json({"error": "bad payload"}, 400)
                return
            db = SessionLocal()
            try:
                old_w = [x.id for x in db.query(Workout.id).filter_by(user_id=me["id"])]
                if old_w:
                    db.query(WorkoutSet).filter(WorkoutSet.workout_id.in_(old_w)) \
                        .delete(synchronize_session=False)
                    db.query(Workout).filter_by(user_id=me["id"]).delete()
                db.query(FoodLog).filter_by(user_id=me["id"]).delete()
                db.query(BodyMetric).filter_by(user_id=me["id"]).delete()
                for x in w[:2000]:
                    if not isinstance(x, dict) or not DATE_RE.match(str(x.get("d") or "")):
                        continue
                    wo = Workout(user_id=me["id"], date=x["d"],
                                 exercise=sstr(x.get("ex"), 128),
                                 duration_min=int(sfloat(x.get("dur"))),
                                 start_ts=sopt(x.get("st")),
                                 end_ts=sopt(x.get("et")),
                                 pause_ms=sopt(x.get("pause")) or 0,
                                 created_at=sint(x.get("ts")))
                    db.add(wo)
                    db.flush()
                    for i, st in enumerate((x.get("sets") or [])[:20]):
                        if not isinstance(st, dict):
                            continue
                        db.add(WorkoutSet(workout_id=wo.id, set_no=i + 1,
                                          weight_kg=sfloat(st.get("w")),
                                          reps=int(sfloat(st.get("r")))))
                for x in f[:2000]:
                    if not isinstance(x, dict) or not DATE_RE.match(str(x.get("d") or "")):
                        continue
                    db.add(FoodLog(user_id=me["id"], date=x["d"],
                                   meal=sstr(x.get("m"), 32), name=sstr(x.get("n")),
                                   kcal=sfloat(x.get("k")), protein=sfloat(x.get("p")),
                                   carbs=sfloat(x.get("c")), fat=sfloat(x.get("f")),
                                   created_at=sint(x.get("ts"))))
                seen = set()
                for x in bw[:2000]:
                    if not isinstance(x, dict) or not DATE_RE.match(str(x.get("d") or "")):
                        continue
                    if x["d"] in seen:
                        continue
                    seen.add(x["d"])
                    db.add(BodyMetric(user_id=me["id"], date=x["d"],
                                      weight_kg=sfloat(x.get("kg")),
                                      note=sstr(x.get("note")),
                                      created_at=sint(x.get("ts"))))
                db.commit()
                self._json({"ok": True, "w": len(w), "f": len(f), "bw": len(bw)})
            finally:
                db.close()
            return
        self._json({"error": "not found"}, 404)


if __name__ == "__main__":
    srv = ThreadingHTTPServer((BIND, PORT), Handler)
    print(f"serving on {BIND}:{PORT} db={MYSQL_DB}@{MYSQL_HOST} register={'open' if ALLOW_REGISTER else 'first-only'}",
          flush=True)
    srv.serve_forever()
