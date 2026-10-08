"""PSI private event service for Mobius json-v1. Python standard library only.

This does not enable public access or live audio. The Mobius caller envelope is
trusted platform input; session/role/booth data in its body is untrusted input.
"""
import base64
import hashlib
import json
import math
import os
import re
import secrets
import sqlite3
import sys
import time
from pathlib import Path

SESSION_TTL = 8 * 3600
PRESENCE_TTL = 20
MAX_POSTER = 4 * 1024 * 1024
DEMO = [
    ("Voda u našem gradu", "Ekologija", "Primjer štanda za istraživanje kvaliteta vode."),
    ("Učenje kroz eksperiment", "Obrazovanje", "Primjer štanda o praktičnoj nastavi i učenju."),
    ("Energija iz obnovljivih izvora", "Inženjerstvo", "Primjer štanda o održivim izvorima energije."),
    ("Digitalna pristupačnost", "Tehnologija", "Primjer štanda o pristupačnom digitalnom okruženju."),
    ("Mikrosvijet oko nas", "Biologija", "Primjer štanda o posmatranju živog svijeta."),
    ("Grad po mjeri mladih", "Društvo", "Primjer štanda o prostoru za mlade u zajednici."),
]


class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def fail(condition, status, message):
    if condition:
        raise Problem(status, message)


def text(value, limit, required=False):
    fail(not isinstance(value, str), 400, "Očekivan je tekst.")
    value = value.strip()
    fail(len(value) > limit or (required and not value), 400, "Tekst je prazan ili predug.")
    fail(any(ord(c) < 32 and c not in "\n\t" for c in value), 400, "Nedozvoljeni znakovi.")
    return value


def number(value, low, high):
    fail(isinstance(value, bool) or not isinstance(value, (int, float)), 400, "Očekivan je broj.")
    fail(not math.isfinite(value) or not low <= value <= high, 400, "Broj je izvan raspona.")
    return float(value)


def avatar(value=None, color=0):
    defaults = {"skin": 1, "hair": 0, "style": 0, "shirt": color, "pants": 0}
    if value is None:
        return defaults
    fail(not isinstance(value, dict), 400, "Neispravan izgled lika.")
    limits = {"skin": 5, "hair": 6, "style": 4, "shirt": 8, "pants": 4}
    fail(any(k not in limits for k in value), 400, "Nepoznat dio izgleda lika.")
    for key, limit in limits.items():
        v = value.get(key, defaults[key])
        fail(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v < limit,
             400, "Neispravan izbor izgleda lika.")
        defaults[key] = v
    return defaults


def public_person(row):
    person = {k: row[k] for k in ("id", "name", "role", "assigned", "color", "x", "y", "booth", "hand")}
    try:
        person["avatar"] = avatar(json.loads(row["avatar"]), row["color"])
    except (ValueError, TypeError, Problem):
        person["avatar"] = avatar(color=row["color"])
    person["direction"] = row["direction"] if row["direction"] in ("up", "down", "left", "right") else "down"
    return person


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def meet_link(value):
    value = text(value, 200)
    if not value:
        return ''
    # A meeting code, not an arbitrary external page or redirect URL.
    fail(not re.fullmatch(r'https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}', value),
         400, 'Unesi Google Meet link sa kodom, bez dodataka iza koda.')
    return value


def connect():
    # Supplied by the reviewed Mobius service runtime, never by a client request.
    root = Path(os.environ["APP_STORAGE_DIR"])
    root.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(root / "psi.sqlite3", timeout=5)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, count INTEGER NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1, created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS booths (
      event TEXT NOT NULL REFERENCES events(id), number INTEGER NOT NULL,
      title TEXT NOT NULL, presenter TEXT NOT NULL, topic TEXT NOT NULL,
      abstract TEXT NOT NULL, fictional INTEGER NOT NULL DEFAULT 1,
      poster_type TEXT, poster_data TEXT, poster_name TEXT,
      PRIMARY KEY(event,number));
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL,
      event TEXT NOT NULL REFERENCES events(id), name TEXT NOT NULL,
      role TEXT NOT NULL, assigned INTEGER, color INTEGER NOT NULL,
      x REAL NOT NULL, y REAL NOT NULL, booth INTEGER,
      hand INTEGER NOT NULL DEFAULT 0, seen REAL NOT NULL, expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS invites (
      token_hash TEXT PRIMARY KEY, event TEXT NOT NULL, booth INTEGER NOT NULL,
      expires REAL NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY, event TEXT NOT NULL, booth INTEGER NOT NULL,
      author_id TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '', resolved INTEGER NOT NULL DEFAULT 0,
      created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS rate (
      key TEXT PRIMARY KEY, start REAL NOT NULL, count INTEGER NOT NULL);
    """)
    with db:
        db.execute("BEGIN IMMEDIATE")
        columns = {row[1] for row in db.execute("PRAGMA table_info(sessions)")}
        if "avatar" not in columns:
            db.execute("ALTER TABLE sessions ADD COLUMN avatar TEXT NOT NULL DEFAULT '{}'")
        if "direction" not in columns:
            db.execute("ALTER TABLE sessions ADD COLUMN direction TEXT NOT NULL DEFAULT 'down'")
        booth_columns = {row[1] for row in db.execute('PRAGMA table_info(booths)')}
        if 'meet_url' not in booth_columns:
            db.execute("ALTER TABLE booths ADD COLUMN meet_url TEXT NOT NULL DEFAULT ''")
    return db


def geometry(count):
    return {"width": 1120, "height": max(670, math.ceil(count / 4) * 230 + 200)}


def booth_position(n):
    return {"x": 155 + ((n - 1) % 4) * 270, "y": 155 + ((n - 1) // 4) * 230}


def can_stand(count, x, y, radius=9):
    g = geometry(count)
    w, h = g["width"], g["height"]
    if not all(math.isfinite(v) for v in (x, y)) or not (radius <= x <= w-radius and radius <= y <= h-radius):
        return False
    solids = [(0, 0, w, 46), (0, 0, 30, h), (w-30, 0, 30, h), (0, h-28, w, 28)]
    for n in range(1, count+1):
        b = booth_position(n)
        solids.extend([(b["x"]-77, b["y"]-63, 154, 67), (b["x"]+90, b["y"]-42, 24, 20)])
    solids.extend([(70, h-112, 146, 38), (260, h-102, 42, 40), (w-168, h-110, 54, 55)])
    return not any(x+radius > a and x-radius < a+rw and y+radius > b and y-radius < b+rh for a, b, rw, rh in solids)


def active_booth(count, x, y):
    for n in range(1, count + 1):
        p = booth_position(n)
        if abs(x - p["x"]) <= 105 and abs(y - p["y"]) <= 82:
            return n
    return None


def event_row(db, event):
    r = db.execute("SELECT * FROM events WHERE id=?", (event,)).fetchone()
    fail(r is None, 404, "Događaj nije pronađen.")
    return r


def session_row(db, data, now):
    token = text(data.get("session", ""), 128, True)
    s = db.execute("SELECT * FROM sessions WHERE token_hash=?", (digest(token),)).fetchone()
    fail(s is None or s["expires"] <= now, 401, "Sesija je istekla. Uđi ponovo.")
    return s


def owner_only(request):
    actor = request.get("actor", {})
    fail(request.get("public") is not False or actor.get("scope") not in ("owner", "app")
         or actor.get("access") != "write" or actor.get("delegated") is True,
         403, "Ova radnja je dostupna samo vlasniku privatne instalacije.")


def require_role(s, *roles):
    fail(s["role"] not in roles, 403, "Nemaš ovlaštenje za ovu radnju.")


def throttle(db, key, limit, now, period=60):
    r = db.execute("SELECT * FROM rate WHERE key=?", (key,)).fetchone()
    if r is None or now - r["start"] >= period:
        db.execute("INSERT OR REPLACE INTO rate VALUES (?,?,1)", (key, now))
    else:
        fail(r["count"] >= limit, 429, "Previše zahtjeva. Sačekaj malo.")
        db.execute("UPDATE rate SET count=count+1 WHERE key=?", (key,))


def new_session(db, event, name, role, assigned, color, now, appearance=None):
    fail(db.execute("SELECT COUNT(*) FROM sessions WHERE event=? AND expires>?",
                    (event, now)).fetchone()[0] >= 100, 409, "Dostignut je limit testne sale.")
    token, sid = secrets.token_urlsafe(32), secrets.token_hex(12)
    g = geometry(event_row(db, event)["count"])
    look = avatar(appearance, color)
    db.execute("INSERT INTO sessions (token_hash,id,event,name,role,assigned,color,x,y,booth,hand,seen,expires,avatar,direction) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
               (digest(token), sid, event, name, role, assigned, color,
                g["width"] / 2, g["height"] - 85, None, 0, now, now + SESSION_TTL, json.dumps(look), "down"))
    return {"session": token, "participantId": sid, "role": role, "assigned": assigned,
            "eventId": event, "expiresAt": now + SESSION_TTL}


def state(db, s, now):
    e = event_row(db, s["event"])
    booths = []
    for row in db.execute("SELECT number,title,presenter,topic,abstract,fictional,"
                          "poster_type,poster_name,meet_url FROM booths WHERE event=? ORDER BY number", (e["id"],)):
        item = dict(row)
        item.update(booth_position(item["number"]))
        item["hasPoster"] = bool(item.pop("poster_type"))
        booths.append(item)
    people = [public_person(r) for r in db.execute(
        "SELECT id,name,role,assigned,color,x,y,booth,hand,avatar,direction FROM sessions "
        "WHERE event=? AND seen>? AND expires>? ORDER BY name", (e["id"], now - PRESENCE_TTL, now))]
    qs = [dict(r) for r in db.execute(
        "SELECT id,booth,author_id,author,body,answer,resolved,created FROM questions "
        "WHERE event=? AND booth=? ORDER BY created DESC LIMIT 100", (e["id"], s["booth"]))]
    return {"event": dict(e), "geometry": geometry(e["count"]), "booths": booths,
            "participants": people, "questions": qs, "self": public_person(s),
            "audio": {"configured": False, "reason": "Live audio provider is not configured."},
            "serverTime": now, "pollAfterMs": 4500}


def handle(request, db):
    fail(not isinstance(request, dict) or request.get("schema") != 1, 400, "Neispravan zahtjev.")
    fail(request.get("method") != "POST", 405, "Koristi POST.")
    data = request.get("body")
    fail(not isinstance(data, dict), 400, "Neispravan sadržaj zahtjeva.")
    op, now = request.get("path", "").strip("/"), time.time()
    # This package intentionally has no public service or public lobby.
    fail(request.get("public") is not False, 403, "Javni pristup nije uključen.")
    actor = request.get("actor", {})
    fail(not isinstance(actor, dict) or actor.get("scope") not in ("owner", "app")
         or actor.get("access") != "write", 403, "Pristup privatnoj sali nije dozvoljen.")
    with db:
        # Read/modify/write (especially consuming invitations) is one transaction
        # even if a future invocation lane allows concurrent processes.
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM sessions WHERE expires<=?", (now,))
        db.execute("DELETE FROM invites WHERE expires<=?", (now,))
        db.execute("DELETE FROM rate WHERE start<?", (now - 3600,))
        if op == "events":
            owner_only(request)
            return {"events": [dict(r) for r in db.execute("SELECT * FROM events ORDER BY created DESC LIMIT 20")]}
        if op == "create":
            owner_only(request)
            name = text(data.get("name", "PSI · Poster sesije"), 120, True)
            n = number(data.get("count", 6), 1, 24)
            fail(n != int(n), 400, "Broj prezentatora mora biti cijeli broj.")
            n = int(n)
            fail(db.execute("SELECT COUNT(*) FROM events").fetchone()[0] >= 20,
                 409, "Dostignut je limit privatnih testnih događaja.")
            eid = secrets.token_hex(8)
            db.execute("INSERT INTO events VALUES (?,?,?,1,?)", (eid, name, n, now))
            for i in range(1, n + 1):
                title, topic, abstract = DEMO[(i - 1) % len(DEMO)]
                db.execute("INSERT INTO booths (event,number,title,presenter,topic,abstract) VALUES (?,?,?,?,?,?)",
                           (eid, i, title, f"Demo tim {i:02d}", topic,
                            abstract + " Fiktivan primjer; ne predstavlja rezultate stvarnog PSI istraživanja."))
            return new_session(db, eid, text(data.get("nameTag", "Organizator"), 40, True),
                               "organizer", None, 0, now, data.get("avatar"))
        if op == "join":
            e = event_row(db, text(data.get("eventId", ""), 32, True))
            fail(not e["is_open"], 409, "Sesija je zatvorena.")
            name = text(data.get("name", ""), 40, True)
            color = number(data.get("color", 1), 0, 7)
            fail(color != int(color), 400, "Neispravna boja.")
            role, assigned = "participant", None
            invite = data.get("invite", "")
            if invite:
                r = db.execute("SELECT * FROM invites WHERE token_hash=?", (digest(text(invite, 128, True)),)).fetchone()
                fail(r is None or r["event"] != e["id"] or r["expires"] <= now or r["used"],
                     403, "Pozivnica za prezentatora nije važeća.")
                role, assigned = "presenter", r["booth"]
                db.execute("UPDATE invites SET used=1 WHERE token_hash=?", (r["token_hash"],))
            return new_session(db, e["id"], name, role, assigned, int(color), now, data.get("avatar"))
        if op == "manage":
            owner_only(request)
            e = event_row(db, text(data.get("eventId", ""), 32, True))
            return new_session(db, e["id"], text(data.get("nameTag", "Organizator"), 40, True), "organizer", None, 0, now, data.get("avatar"))

        s = session_row(db, data, now)
        e = event_row(db, s["event"])
        if op == "leave":
            db.execute("UPDATE sessions SET expires=?,seen=0 WHERE token_hash=?", (now, s["token_hash"]))
            return {"ok": True}
        if op == "profile":
            fail(any(k not in {"session", "name", "avatar"} for k in data), 400, "Neispravna izmjena profila.")
            throttle(db, s["id"] + ":profile", 12, now)
            look = avatar(data.get("avatar"), s["color"])
            name = text(data.get("name", s["name"]), 40, True)
            db.execute("UPDATE sessions SET name=?,avatar=?,color=?,seen=? WHERE token_hash=?",
                       (name, json.dumps(look), look["shirt"], now, s["token_hash"]))
            return state(db, session_row(db, data, now), now)
        if op == "sync":
            throttle(db, s["id"] + ":sync", 45, now)
            g = geometry(e["count"])
            x = number(data.get("x", s["x"]), 20, g["width"] - 20)
            y = number(data.get("y", s["y"]), 20, g["height"] - 20)
            fail(not can_stand(e["count"], x, y), 400, "Ovdje je prepreka. Izaberi prolaz u sali.")
            direction = data.get("direction", s["direction"])
            fail(direction not in ("up", "down", "left", "right"), 400, "Neispravan smjer.")
            booth = active_booth(e["count"], x, y)
            hand = data.get("hand", bool(s["hand"]))
            fail(not isinstance(hand, bool), 400, "Neispravna vrijednost ruke.")
            db.execute("UPDATE sessions SET x=?,y=?,booth=?,hand=?,seen=?,direction=? WHERE token_hash=?",
                       (x, y, booth, int(hand), now, direction, s["token_hash"]))
            s = session_row(db, data, now)
            return state(db, s, now)
        if op == "question":
            fail(not e["is_open"] or not s["booth"], 409, "Uđi u štand otvorene sesije.")
            throttle(db, s["id"] + ":q", 6, now)
            fail(db.execute("SELECT COUNT(*) FROM questions WHERE event=?", (s["event"],)).fetchone()[0] >= 3000,
                 409, "Sala je dostigla limit sačuvanih pitanja.")
            body = text(data.get("text", ""), 700, True)
            qid = secrets.token_hex(10)
            db.execute("INSERT INTO questions (id,event,booth,author_id,author,body,created) VALUES (?,?,?,?,?,?,?)",
                       (qid, s["event"], s["booth"], s["id"], s["name"], body, now))
            return {"ok": True, "id": qid}
        if op == "answer":
            require_role(s, "organizer", "presenter")
            q = db.execute("SELECT * FROM questions WHERE id=? AND event=?",
                           (text(data.get("id", ""), 30, True), s["event"])).fetchone()
            fail(q is None, 404, "Pitanje nije pronađeno.")
            fail(s["role"] == "presenter" and q["booth"] != s["assigned"], 403, "Pitanje pripada drugom štandu.")
            answer = text(data.get("answer", ""), 1500)
            db.execute("UPDATE questions SET answer=?,resolved=? WHERE id=?", (answer, int(data.get("resolved") is True), q["id"]))
            return {"ok": True}
        if op == "settings":
            require_role(s, "organizer")
            name = text(data.get("name", e["name"]), 120, True)
            opened = data.get("open", bool(e["is_open"]))
            fail(not isinstance(opened, bool), 400, "Neispravna vrijednost sesije.")
            db.execute("UPDATE events SET name=?,is_open=? WHERE id=?", (name, int(opened), s["event"]))
            return {"ok": True}
        if op == "invite":
            require_role(s, "organizer")
            n = number(data.get("booth"), 1, e["count"])
            fail(n != int(n), 400, "Neispravan štand.")
            inv = secrets.token_urlsafe(24)
            db.execute("DELETE FROM invites WHERE event=? AND booth=? AND used=0", (s["event"], int(n)))
            db.execute("INSERT INTO invites VALUES (?,?,?,?,0)", (digest(inv), s["event"], int(n), now + 86400))
            return {"invite": inv, "booth": int(n), "expiresAt": now + 86400}
        if op in ("edit-booth", "poster", "get-poster"):
            n = number(data.get("booth"), 1, e["count"])
            fail(n != int(n), 400, "Neispravan štand.")
            n = int(n)
            if op != "get-poster":
                require_role(s, "organizer", "presenter")
                fail(s["role"] == "presenter" and s["assigned"] != n, 403, "Štand pripada drugom prezentatoru.")
            row = db.execute("SELECT * FROM booths WHERE event=? AND number=?", (s["event"], n)).fetchone()
            if op == "edit-booth":
                meeting = meet_link(data.get('meet_url', row['meet_url']))
                fail(meeting != row['meet_url'] and s['role'] != 'organizer',
                     403, 'Meet link dodjeljuje organizator.')
                title = text(data.get("title", row["title"]), 140, True)
                presenter = text(data.get("presenter", row["presenter"]), 80, True)
                topic = text(data.get("topic", row["topic"]), 60, True)
                abstract = text(data.get("abstract", row["abstract"]), 6000)
                fictional = data.get("fictional", bool(row["fictional"]))
                fail(not isinstance(fictional, bool), 400, "Neispravna demo oznaka.")
                db.execute("UPDATE booths SET title=?,presenter=?,topic=?,abstract=?,fictional=?,meet_url=? WHERE event=? AND number=?",
                           (title, presenter, topic, abstract, int(fictional), meeting, s["event"], n))
                return {"ok": True}
            if op == "get-poster":
                fail(s["booth"] != n and s["role"] != "organizer" and
                     not (s["role"] == "presenter" and s["assigned"] == n),
                     403, "Priđi ovom štandu da pogledaš poster.")
                return {"type": row["poster_type"], "name": row["poster_name"], "base64": row["poster_data"]}
            b64 = text(data.get("base64", ""), math.ceil(MAX_POSTER * 4 / 3) + 8, True)
            try:
                raw = base64.b64decode(b64, validate=True)
            except (ValueError, TypeError):
                raise Problem(400, "Neispravan sadržaj datoteke.")
            fail(len(raw) > MAX_POSTER, 413, "Poster može imati najviše 4 MB.")
            mime = data.get("type")
            signatures = {"application/pdf": raw.startswith(b"%PDF-"),
                          "image/png": raw.startswith(b"\x89PNG\r\n\x1a\n"),
                          "image/jpeg": raw.startswith(b"\xff\xd8\xff")}
            fail(not signatures.get(mime), 400, "Dozvoljeni su PDF, PNG i JPEG odgovarajućeg formata.")
            name = text(data.get("name", "poster"), 160, True)
            db.execute("UPDATE booths SET poster_type=?,poster_data=?,poster_name=? WHERE event=? AND number=?",
                       (mime, b64, name, s["event"], n))
            return {"ok": True}
        raise Problem(404, "Nepoznata radnja.")


def main():
    try:
        raw = sys.stdin.buffer.read(8 * 1024 * 1024 + 1)
        fail(len(raw) > 8 * 1024 * 1024, 413, "Zahtjev je prevelik.")
        request = json.loads(raw, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        with connect() as db:
            body = handle(request, db)
        response = {"status": 200, "body": body, "headers": {"cache-control": "no-store"}}
    except Problem as e:
        response = {"status": e.status, "body": {"error": e.message}}
    except (ValueError, TypeError, KeyError):
        response = {"status": 400, "body": {"error": "Neispravan zahtjev."}}
    except sqlite3.OperationalError:
        response = {"status": 503, "body": {"error": "Sala je zauzeta. Pokušaj ponovo."}}
    print(json.dumps(response, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
