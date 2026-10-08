"""Opt-in private install smoke test. Never run automatically on app open.

Uses the agent's owner authority ONLY to obtain the same scoped app transport
bearer supplied by Mobius to a real app frame. All service calls use that scoped
bearer. No credential/session is printed, stored, or put in a URL.
Only this script's synthetic event is removed afterwards, with ownership checks.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import sqlite3
import urllib.error
import urllib.request


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--app-id',type=int,required=True)
    args=parser.parse_args()
    base=os.environ['API_BASE_URL'].rstrip('/')
    def request(path,body=None,bearer=None):
        headers={'Content-Type':'application/json'}
        if bearer:headers['Authorization']='Bearer '+bearer
        req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,
                                   headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.loads(r.read())
        except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
    status,scoped=request('/api/auth/app-token',{'app_id':args.app_id},os.environ['AGENT_TOKEN'])
    assert status==200,'Scoped bearer provisioning failed'
    token=scoped['token']
    def call(op,body):
        status,data=request(f'/api/apps/{args.app_id}/service/{op}',body,token)
        return status,data
    def ok(op,body):
        status,data=call(op,body)
        assert status==200,f'{op} failed with HTTP {status}'
        return data
    name='Automatska provjera · fiktivni test '+secrets.token_hex(6)
    owner=ok('create',{'count':6,'name':name})
    sid=[]
    try:
        look_a={'skin':4,'hair':2,'style':3,'shirt':5,'pants':2}
        look_b={'skin':1,'hair':0,'style':1,'shirt':2,'pants':0}
        a=ok('join',{'eventId':owner['eventId'],'name':'Test klijent A','avatar':look_a})
        b=ok('join',{'eventId':owner['eventId'],'name':'Test klijent B','avatar':look_b})
        sid=[owner['participantId'],a['participantId'],b['participantId']]
        def sync(s,n):return ok('sync',{'session':s['session'],'x':155+(n-1)*270,'y':190})
        sync(a,1);sync(b,2)
        ok('question',{'session':a['session'],'text':'Fiktivno testno pitanje'})
        different=sync(b,2);assert different['questions']==[],'Booth questions leaked'
        same=sync(b,1);assert same['questions'][0]['body']=='Fiktivno testno pitanje'
        assert a['participantId'] in [p['id'] for p in same['participants']]
        assert same['self']['avatar']==look_b
        assert next(person for person in same['participants'] if person['id']==a['participantId'])['avatar']==look_a
        changed=ok('profile',{'session':a['session'],'name':'Test klijent A','avatar':{**look_a,'shirt':7}})
        assert changed['self']['avatar']['shirt']==7
        seen=sync(b,1)
        assert next(person for person in seen['participants'] if person['id']==a['participantId'])['avatar']['shirt']==7
        assert call('profile',{'session':a['session'],'role':'organizer','avatar':look_a})[0]==400
        assert call('sync',{'session':a['session'],'x':155,'y':155})[0]==400
        directed=ok('sync',{'session':a['session'],'x':155,'y':190,'direction':'up'})
        assert directed['self']['direction']=='up' and directed['self']['role']=='participant'
        inv=ok('invite',{'session':owner['session'],'booth':1})
        p=ok('join',{'eventId':owner['eventId'],'name':'Test prezentator','invite':inv['invite']})
        sid.append(p['participantId'])
        assert call('join',{'eventId':owner['eventId'],'name':'Test reuse','invite':inv['invite']})[0]==403
        assert call('edit-booth',{'session':p['session'],'booth':2,'title':'Denied'})[0]==403
        assert call('settings',{'session':a['session'],'open':False})[0]==403
        meeting='https://meet.google.com/abc-defg-hij'
        ok('edit-booth',{'session':owner['session'],'booth':1,'meet_url':meeting})
        assert sync(a,1)['booths'][0]['meet_url']==meeting
        assert call('edit-booth',{'session':p['session'],'booth':1,'meet_url':''})[0]==403
        q=same['questions'][0]['id']
        ok('answer',{'session':p['session'],'id':q,'answer':'Fiktivan testni odgovor','resolved':True})
        assert sync(a,1)['questions'][0]['answer']=='Fiktivan testni odgovor'
        raw=b'%PDF-1.7\nSynthetic transport fixture only, not a viewer fixture.'
        ok('poster',{'session':p['session'],'booth':1,'name':'synthetic-transport.pdf',
                     'type':'application/pdf','base64':base64.b64encode(raw).decode()})
        poster=ok('get-poster',{'session':a['session'],'booth':1})
        assert hashlib.sha256(base64.b64decode(poster['base64'])).digest()==hashlib.sha256(raw).digest()
        sync(b,2);assert call('get-poster',{'session':b['session'],'booth':1})[0]==403
        assert request(f'/api/apps/{args.app_id}/service/events',{})[0] in (401,403)
        assert request('/api/app-services/psi-poster-hall/events',{})[0]==404
        for s in (a,b,p,owner):ok('leave',{'session':s['session']})
        print('PASS: installed scoped transport, two clients shared appearance/profile/presence/Q&A, collision/direction validation, booth isolation, presenter ownership, one-use invite, poster round-trip, private/public gates and leave.')
    finally:
        # Own fixtures only. If another person joined/edited, retain instead.
        dbpath=Path('/data/apps')/str(args.app_id)/'psi.sqlite3'
        with sqlite3.connect(dbpath,timeout=5) as db:
            db.execute('PRAGMA foreign_keys=ON');db.execute('BEGIN IMMEDIATE')
            eid=owner['eventId']
            names=db.execute('SELECT name FROM events WHERE id=?',(eid,)).fetchone()
            users={r[0] for r in db.execute('SELECT id FROM sessions WHERE event=?',(eid,))}
            authors={r[0] for r in db.execute('SELECT author_id FROM questions WHERE event=?',(eid,))}
            if names==(name,) and users<=set(sid) and authors<=set(sid):
                for table in ('questions','invites','sessions','booths'):db.execute(f'DELETE FROM {table} WHERE event=?',(eid,))
                for participant in sid:db.execute('DELETE FROM rate WHERE key LIKE ?',(participant+':%',))
                db.execute('DELETE FROM events WHERE id=?',(eid,))
                print('Own synthetic fixture cleaned; no live attendees left behind.')
            else:print('Fixture retained because independent changes were detected.')


if __name__=='__main__':main()
