import base64
import os
import json
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from audio.authority import membership, mint_livekit_token

import service


def walk_point(n):
    p = service.booth_position(n)
    return {"x":p["x"],"y":p["y"]+35}


class PosterServiceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["APP_STORAGE_DIR"] = self.tmp.name
        self.db = service.connect()
        self.owner = self.call("create", {"count": 6, "name": "Privatni test"})
        self.event = self.owner["eventId"]
        self.a = self.call("join", {"eventId": self.event, "name": "Demo A"})
        self.b = self.call("join", {"eventId": self.event, "name": "Demo B"})

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def call(self, path, body, public=False):
        return service.handle({"schema": 1, "method": "POST", "path": path,
                               "public": public, "actor": {"scope": "app", "access": "write", "delegated": False},
                               "body": body}, self.db)

    def sync(self, session, n):
        return self.call("sync", {"session": session["session"], **walk_point(n)})

    def test_shared_presence_and_question_isolation(self):
        self.sync(self.a, 1)
        sb = self.sync(self.b, 2)
        self.assertEqual(len(sb["participants"]), 3)
        self.call("question", {"session": self.a["session"], "text": "Kako ste odabrali metodu?"})
        self.assertEqual(self.sync(self.b, 2)["questions"], [])
        self.assertEqual(len(self.sync(self.b, 1)["questions"]), 1)
        self.call("leave", {"session": self.a["session"]})
        self.assertEqual(len(self.sync(self.b, 1)["participants"]), 2)

    def test_roles_and_invite_reuse(self):
        with self.assertRaises(service.Problem) as cm:
            self.call("settings", {"session": self.a["session"], "open": False})
        self.assertEqual(cm.exception.status, 403)
        inv = self.call("invite", {"session": self.owner["session"], "booth": 1})
        presenter = self.call("join", {"eventId": self.event, "name": "Demo prezentator", "invite": inv["invite"]})
        self.call("edit-booth", {"session": presenter["session"], "booth": 1, "title": "Dozvoljena izmjena"})
        with self.assertRaises(service.Problem):
            self.call("edit-booth", {"session": presenter["session"], "booth": 2, "title": "Nedozvoljena izmjena"})
        with self.assertRaises(service.Problem):
            self.call("join", {"eventId": self.event, "name": "Drugi", "invite": inv["invite"]})

    def test_poster_validation_closed_join_and_public_block(self):
        with self.assertRaises(service.Problem):
            self.call("poster", {"session": self.owner["session"], "booth": 1,
                                 "type": "image/png", "base64": base64.b64encode(b"<script>").decode()})
        self.call("settings", {"session": self.owner["session"], "open": False})
        with self.assertRaises(service.Problem):
            self.call("join", {"eventId": self.event, "name": "Kasni dolazak"})
        with self.assertRaises(service.Problem):
            self.call("events", {}, public=True)

    def test_expiry_reopen_and_count_validation(self):
        for count in [0, 25, 3.5, True]:
            with self.assertRaises(service.Problem):
                self.call("create", {"count": count})
        self.db.close()
        self.db = service.connect()
        result = self.sync(self.a, 1)
        self.assertEqual(len(result["booths"]), 6)
        self.assertFalse(result["audio"]["configured"])
        self.db.execute("UPDATE sessions SET expires=0 WHERE id=?", (self.a["participantId"],))
        self.db.commit()
        with self.assertRaises(service.Problem):
            self.sync(self.a, 1)

    def test_separate_processes_share_presence_and_questions(self):
        def process(path, body):
            result = subprocess.run([sys.executable, service.__file__],
                input=json.dumps({"schema": 1, "method": "POST", "path": path,
                                  "public": False, "actor": {"scope": "app", "access": "write", "delegated": False},
                                  "body": body}), text=True, capture_output=True, check=True)
            reply = json.loads(result.stdout)
            self.assertEqual(reply["status"], 200)
            return reply["body"]
        self.db.commit()
        process("sync", {"session": self.a["session"], **walk_point(1)})
        process("question", {"session": self.a["session"], "text": "Pitanje iz prvog klijenta"})
        result = process("sync", {"session": self.b["session"], **walk_point(1)})
        self.assertEqual(result["questions"][0]["body"], "Pitanje iz prvog klijenta")
        self.assertIn(self.a["participantId"], [p["id"] for p in result["participants"]])

    def test_actor_read_unknown_and_delegated_management_denied(self):
        for actor in [{"scope":"app","access":"read"}, {"scope":"public","access":"write"},
                      {"scope":"unknown","access":"write"}, {}]:
            with self.assertRaises(service.Problem) as cm:
                service.handle({"schema":1,"method":"POST","path":"sync","public":False,
                                "actor":actor,"body":{"session":self.a["session"]}},self.db)
            self.assertEqual(cm.exception.status,403)
        with self.assertRaises(service.Problem):
            service.handle({"schema":1,"method":"POST","path":"manage","public":False,
                            "actor":{"scope":"app","access":"write","delegated":True},
                            "body":{"eventId":self.event}},self.db)

    def test_new_event_has_no_other_event_posters_questions_or_people(self):
        self.sync(self.a,1)
        self.call("question",{"session":self.a["session"],"text":"Only event A"})
        other=self.call("create",{"count":1,"name":"Other event"})
        result=self.sync(other,1)
        self.assertEqual(result["questions"],[])
        self.assertEqual(len(result["participants"]),1)
        self.assertFalse(result["booths"][0]["hasPoster"])
        self.assertTrue(result["booths"][0]["fictional"])

    def test_counts_geometry_and_sql_literal_text(self):
        for n in (1,24):
            created=self.call("create",{"count":n,"name":"'; DROP TABLE events; --"})
            w=self.sync(created,n)
            self.assertEqual(len(w["booths"]),n)
            self.assertEqual(w["self"]["booth"],n)
        for n in range(1,25):
            g=service.geometry(n)
            positions={tuple(service.booth_position(i).values()) for i in range(1,n+1)}
            self.assertEqual(len(positions),n)
            self.assertTrue(all(x<g["width"] and y<g["height"] for x,y in positions))

    def test_concurrent_invitation_consumption_exactly_once(self):
        invite=self.call("invite",{"session":self.owner["session"],"booth":1})["invite"]
        def join(i):
            envelope={"schema":1,"method":"POST","path":"join","public":False,
                      "actor":{"scope":"app","access":"write","delegated":False},
                      "body":{"eventId":self.event,"name":f"Race {i}","invite":invite}}
            p=subprocess.run([sys.executable,service.__file__],input=json.dumps(envelope),
                             text=True,capture_output=True,check=True)
            return json.loads(p.stdout)["status"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(join,[1,2])),[200,403])

    def test_invalid_join_does_not_consume_invitation_and_reissue_retires_old(self):
        old=self.call("invite",{"session":self.owner["session"],"booth":1})["invite"]
        with self.assertRaises(service.Problem):
            self.call("join",{"eventId":self.event,"name":"","invite":old})
        new=self.call("invite",{"session":self.owner["session"],"booth":1})["invite"]
        with self.assertRaises(service.Problem):
            self.call("join",{"eventId":self.event,"name":"Old","invite":old})
        presenter=self.call("join",{"eventId":self.event,"name":"New","invite":new})
        self.assertEqual(presenter["assigned"],1)

    def test_posters_require_booth_and_ownership_and_size(self):
        payload={"booth":1,"type":"application/pdf","name":"fixture.pdf",
                 "base64":base64.b64encode(b"%PDF-1.7\nfixture").decode()}
        self.call("poster",{"session":self.owner["session"],**payload})
        with self.assertRaises(service.Problem):
            self.call("poster",{"session":self.a["session"],**payload})
        self.sync(self.a,2)
        with self.assertRaises(service.Problem):
            self.call("get-poster",{"session":self.a["session"],"booth":1})
        self.sync(self.a,1)
        self.assertEqual(self.call("get-poster",{"session":self.a["session"],"booth":1})["type"],"application/pdf")
        with self.assertRaises(service.Problem) as cm:
            self.call("poster",{"session":self.owner["session"],**payload,
                                "base64":base64.b64encode(b"%PDF-"+b"a"*service.MAX_POSTER).decode()})
        self.assertEqual(cm.exception.status,413)

    def test_question_answer_and_session_payload_cannot_elevate_role(self):
        self.sync(self.a,1)
        q=self.call("question",{"session":self.a["session"],"text":"Question"})["id"]
        for operation,extra in [("answer",{"id":q,"answer":"Denied"}),
                                ("settings",{"open":False}),("invite",{"booth":1})]:
            with self.assertRaises(service.Problem):
                self.call(operation,{"session":self.a["session"],"role":"organizer",**extra})
        inv=self.call("invite",{"session":self.owner["session"],"booth":2})["invite"]
        p=self.call("join",{"eventId":self.event,"name":"Presenter","invite":inv})
        with self.assertRaises(service.Problem):
            self.call("answer",{"session":p["session"],"id":q,"answer":"Wrong booth"})
        self.call("answer",{"session":self.owner["session"],"id":q,"answer":"Authorized","resolved":True})
        self.assertEqual(self.sync(self.a,1)["questions"][0]["answer"],"Authorized")

    def test_question_rate_and_presence_expiry_and_memory_only_bearers(self):
        self.sync(self.a,1)
        for i in range(6): self.call("question",{"session":self.a["session"],"text":str(i)})
        with self.assertRaises(service.Problem) as cm:
            self.call("question",{"session":self.a["session"],"text":"Over limit"})
        self.assertEqual(cm.exception.status,429)
        self.db.execute("UPDATE sessions SET seen=0 WHERE id=?",(self.a["participantId"],));self.db.commit()
        w=self.sync(self.b,1)
        self.assertNotIn(self.a["participantId"],[p["id"] for p in w["participants"]])
        self.assertNotIn(self.a["session"],json.dumps(w))
        self.assertNotIn(self.a["session"],json.dumps([dict(r) for r in self.db.execute('SELECT * FROM sessions')]))

    def test_dormant_audio_authority_enforces_booth_role_and_closed_event(self):
        self.sync(self.a,1)
        lease=membership(self.db,self.a["participantId"],self.event,1)
        self.assertFalse(lease["can_publish"])
        with self.assertRaises(PermissionError):membership(self.db,self.a["participantId"],self.event,2)
        with self.assertRaises(RuntimeError):mint_livekit_token(lease,None)
        self.call("settings",{"session":self.owner["session"],"open":False})
        with self.assertRaises(PermissionError):membership(self.db,self.a["participantId"],self.event,1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
