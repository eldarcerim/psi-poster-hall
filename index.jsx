import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PixelHall from './PixelHall.jsx';
import {PixelAvatar,AvatarEditor} from './PixelAvatar.jsx';
import {DEFAULT_AVATAR,normalizeAvatar} from './pixel-world.mjs';
import {PIXEL_CSS} from './pixel-theme.js';
import { CSS } from './theme.js';
import {meetingArrival} from './booth-meet.mjs';
import PosterViewer, { POSTER_CSS } from './PosterViewer.jsx';
import { createTransport } from './transport.js';
import {readPosterFile} from './poster-upload.js';
function DemoPoster({
  booth,
  en
}) {
  return <div className="psi-demo-poster"><div className="psi-tag">PSI / {en ? 'Fictional example' : 'Fiktivan primjer'}</div><h2>{booth.title}</h2><p>{booth.presenter} · {booth.topic}</p><div className="psi-demo-figure" aria-hidden="true"><span /><span style={{
        borderRadius: 8,
        background: '#c4d3b4'
      }} /><span style={{
        background: '#e7dba8'
      }} /></div><h3>{en ? 'Research question' : 'Istraživačko pitanje'}</h3><p>{booth.abstract}</p><div className="psi-demo-lines" aria-hidden="true"><div className="psi-demo-block" /><div className="psi-demo-block" /></div><h3>{en ? 'Your poster belongs here' : 'Ovdje pripada tvoj poster'}</h3><p>{en ? 'Upload your own PDF or image. This layout contains no real research findings.' : 'Postavi vlastiti PDF ili sliku. Ovaj primjer ne sadrži rezultate stvarnog istraživanja.'}</p></div>;
}
export default function App({
  appId,
  token
}) {
  const [en, setEn] = useState(false),
    T = (bs, eng) => en ? eng : bs;
  const [events, setEvents] = useState([]),
    [name, setName] = useState('PSI · Poster sesije'),
    [count, setCount] = useState(6),
    [session, setSession] = useState(null),
    [world, setWorld] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [modal, setModal] = useState(null),
    [joinName, setJoinName] = useState(''),
    [avatar, setAvatar] = useState({...DEFAULT_AVATAR}),
    [avatarDraft,setAvatarDraft] = useState({...DEFAULT_AVATAR}),
    [invite, setInvite] = useState(''),
    [query, setQuery] = useState(''),
    [panel, setPanel] = useState('booths'),
    [question, setQuestion] = useState(''),
    [answer, setAnswer] = useState(''),
    [poster, setPoster] = useState(null),
    [draft, setDraft] = useState(null),
    [lastSync, setLastSync] = useState(null);
  const position = useRef({
      x: 560,
      y: 585
    }),
    [pos, setPos] = useState(position.current),
    hand = useRef(false),
    [handUp, setHandUp] = useState(false),
    flight = useRef(null),
    alive = useRef(true),
    currentSession = useRef(null),
    hallRef = useRef(null),
    meetingVisit = useRef({number:null,offered:false}),
    direction = useRef('down'),
    closeRef = useRef(null);
  const transport = useMemo(() => createTransport({
    appId,
    token
  }), [appId, token]);
  useEffect(() => () => transport.close(), [transport]);
  const api = useCallback((op, body = {}) => transport.call(op, body), [transport]);
  const loadEvents = useCallback(() => api('events').then(r => {setEvents(r.events);setError('');window.mobius?.signal('app_ready',{item_count:r.events.length})}).catch(e => setError(e.message)), [api]);
  useEffect(() => {
    alive.current = true;
    loadEvents();
    return () => {
      alive.current = false;
    };
  }, [loadEvents]);
  const run = async fn => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(en ? 'The action could not be completed. Please try again.' : e.message);
      window.mobius?.signal('error', {
        message: 'PSI action failed',
        source: 'action'
      });
    } finally {
      setBusy(false);
    }
  };
  const begin = async (op, data) => {
    const s = await api(op, data);
    window.mobius?.signal(op === 'create' ? 'item_created' : 'app_ready', {
      type: 'event'
    });
    setInvite('');
    currentSession.current = s.session;
    meetingVisit.current={number:null,offered:false};
    setSession(s);
    setWorld(null);
    setModal(null);
    setPanel('booths');
    hand.current = false;
    setHandUp(false);
    const state = await api('sync', {
      session: s.session
    });
    position.current = {
      x: state.self.x,
      y: state.self.y
    };
    setPos(position.current);
    setAvatar(normalizeAvatar(state.self.avatar));
    setWorld(state);
    setOnline(true);
    setLastSync(Date.now());
  };
  const sync = useCallback(async () => {
    if (!session) return;
    if (flight.current) return flight.current;
    const task = api('sync', {
      session: session.session,
      ...position.current,
      direction: direction.current,
      hand: hand.current
    });
    flight.current = task;
    try {
      const w = await task;
      if (alive.current && currentSession.current === session.session) {
        setWorld(w);
        setOnline(true);
        setLastSync(Date.now());
        setError('');
      }
      return w;
    } catch (e) {
      if (alive.current && currentSession.current === session.session) {
        setOnline(false);
        setError(en ? 'Connection lost. Please retry.' : e.message);
      }
      throw e;
    } finally {
      if (flight.current === task) flight.current = null;
    }
  }, [api, session, en]);
  useEffect(() => {
    if (!session) return;
    let active = true,
      timer,
      running = false;
    const tick = async () => {
      if (running || !active) return;
      running = true;
      try {
        await sync();
      } catch {} finally {
        running = false;
        if (active) {
          clearTimeout(timer);
          timer = setTimeout(tick, 4500);
        }
      }
    };
    timer = setTimeout(tick, 4500);
    const visible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [session, sync]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  const move = (p,dir) => {
    position.current = p;
    direction.current = dir;
    setPos(p);
  };
  const go = async b => {
    const owned = currentSession.current;
    const at = position.current;
    const arrived = Math.abs(b.x-at.x)<=105 && Math.abs(b.y-at.y)<=82 || await hallRef.current?.walkTo(b.x,b.y+35);
    if (!arrived || !owned || currentSession.current!==owned) return;
    setPanel('questions');
    if (flight.current) await flight.current;
    if (currentSession.current===owned) await sync();
  };
  const activeBooth = world?.booths.find(b => Math.abs(b.x - pos.x) <= 105 && Math.abs(b.y - pos.y) <= 82);
  useEffect(()=>{
    const next=meetingArrival(meetingVisit.current,activeBooth,world?.self.booth,Boolean(modal)||busy);
    meetingVisit.current=next.state;
    if(next.offer)setModal({kind:'meet',booth:activeBooth});
  },[activeBooth?.number,activeBooth?.meet_url,world?.self.booth,modal,busy]);
  const canEdit = b => session?.role === 'organizer' || session?.role === 'presenter' && session.assigned === b.number;
  const leave = () => run(async () => {
    const old = session.session;
    hallRef.current?.stop();
    currentSession.current = null;
    setSession(null);
    setWorld(null);
    setOnline(false);
    setError('');
    try {
      await api('leave', {
        session: old
      });
    } finally {
      loadEvents();
    }
  });
  const choosePoster = async b => {
    if (flight.current) await flight.current;
    await sync();
    setPoster(null);
    setModal({
      kind: 'poster',
      booth: b
    });
    if (b.hasPoster) {
      const p = await api('get-poster', {
        session: session.session,
        booth: b.number
      });
      setPoster(p);
    }
  };
  const upload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    await run(async () => {
      const payload=await readPosterFile(file);
      await api('poster',{session:session.session,booth:modal.booth.number,...payload});
      e.target.value='';
      await sync();
      setModal(null);
    });
  };
  const modalClose = () => {
    setModal(null);
    setPoster(null);
    setInvite('');
  };
  const visibleBooths = world?.booths.filter(b => (b.title + ' ' + b.presenter + ' ' + b.topic).toLocaleLowerCase().includes(query.toLocaleLowerCase())) || [];
  return <div className="psi"><style>{CSS + POSTER_CSS + PIXEL_CSS}</style><header className="psi-header"><div className="psi-brand"><div className="psi-brandmark" aria-label="PSI">PSI</div><div><strong>{T('Prostor za ideje', 'A space for ideas')}</strong><small>{T('PROJEKAT STUDENTSKIH ISTRAŽIVANJA', 'STUDENT RESEARCH PROJECT')}</small></div></div><div className="psi-row"><span className="psi-badge">{T('Privatna testna sala', 'Private test hall')}</span><button className="psi-lang" onClick={() => setEn(v => !v)} aria-label="Change language">{en ? 'BS' : 'EN'}</button></div></header>
  {!session ? <main className="psi-lobby"><div className="psi-hero"><div><div className="psi-tag">ANNT / {T('Susreti oko nauke', 'Conversations around science')}</div><h1>{T('Poster sesije', 'Poster sessions')}</h1><p>{T('Izaberi salu i priđi posteru.', 'Choose a hall and approach a poster.')}</p><p className="psi-note" style={{
            marginTop: 20
          }}>{T('Pitanja ostaju uz poster. Razgovor se otvara u Google Meetu.', 'Questions stay beside the poster. Calls open in Google Meet.')}</p></div><section className="psi-create"><div className="psi-tag">01 / {T('Tvoja poster sesija', 'Your poster session')}</div><h2 style={{
            marginTop: 10
          }}>{T('Pripremi novu salu', 'Set up a new hall')}</h2><label>{T('Naziv događaja', 'Event name')}<input value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label><label>{T('Broj prezentatora', 'Number of presenters')}<select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({
                length: 24
              }, (_, i) => <option key={i} value={i + 1}>{i + 1} {T('štandova', 'booths')}</option>)}</select></label><div className="psi-gridmini" aria-label={`${count} booths`}>{Array.from({
              length: count
            }, (_, i) => <span key={i}>{String(i + 1).padStart(2, '0')}</span>)}</div><button className="psi-primary psi-wide" disabled={busy || !name.trim()} onClick={() => { setAvatarDraft(avatar); setModal({kind:'create'}); }}>{busy ? T('Pripremam…', 'Preparing…') : T('Kreiraj privatnu salu', 'Create private hall')}</button><p className="psi-note" style={{
            marginTop: 12
          }}>{T('Početni posteri su označeni kao fiktivni primjeri. Broj štandova bira se pri kreiranju.', 'Starter posters are marked as fictional examples. Choose the number of booths when creating the event.')}</p></section></div>{error && <div role="alert" className="psi-error">{error}</div>}<section className="psi-events"><div className="psi-events-head"><h2>{T('Tvoje sale', 'Your halls')}</h2><button disabled={busy} onClick={()=>run(loadEvents)}>{T('Osvježi', 'Refresh')}</button></div>{!events.length ? <div className="psi-empty">{T('Ovdje će biti tvoji sačuvani događaji.', 'Your saved events will appear here.')}</div> : <div className="psi-event-grid">{events.map(e => <article className="psi-event" key={e.id}><div className="psi-row psi-spread"><span className="psi-tag">{e.count} {T('POSTERA', 'POSTERS')}</span><span className="psi-count">{e.is_open ? T('Otvoreno', 'Open') : T('Zatvoreno', 'Closed')}</span></div><h3>{e.name}</h3><div className="psi-row"><button className="psi-primary" disabled={busy || !e.is_open} onClick={() => {
                setAvatarDraft(avatar);
                setInvite('');
                setModal({
                  kind: 'join',
                  event: e
                });
              }}>{T('Uđi u salu', 'Enter hall')}</button><button disabled={busy} onClick={() => {setAvatarDraft(avatar);setModal({kind:'manage',event:e});}}>{T('Upravljaj', 'Manage')}</button></div></article>)}</div>}</section></main> : !world ? <div className="psi-empty">{T('Povezivanje sa salom…', 'Connecting to the hall…')}{error && <div className="psi-error">{error}<button onClick={() => {
          setSession(null);
          setError('');
        }}>{T('Nazad', 'Back')}</button></div>}</div> : <>
  <div className="psi-toolbar"><div><h2>{world.event.name}</h2><div className="psi-status" role="status">{online ? '●' : '○'} {online ? T('Povezano', 'Connected') : T('Veza prekinuta', 'Disconnected')} · {world.participants.length} {T('u sali', 'in the hall')} · {session.role === 'organizer' ? T('Organizator', 'Organizer') : session.role === 'presenter' ? T('Prezentator', 'Presenter') : T('Učesnik', 'Participant')}</div></div><div className="psi-row"><button className="psi-avatar-toolbar psi-muted-button" onClick={()=>{setAvatarDraft(avatar);setJoinName(world.self.name);setModal({kind:'profile'});}}><PixelAvatar avatar={avatar} size={24}/>{T('Moj lik','My avatar')}</button>{session.role === 'organizer' && <button disabled={busy} className="psi-muted-button" onClick={() => run(async () => {
            await api('settings', {
              session: session.session,
              open: !world.event.is_open
            });
            await sync();
          })}>{world.event.is_open ? T('Zatvori sesiju', 'Close session') : T('Otvori sesiju', 'Open session')}</button>}<button className="psi-muted-button" onClick={leave}>{T('Napusti salu', 'Leave hall')}</button></div></div>{!world.event.is_open && <div className="psi-closed">{T('Sesija je zatvorena za nove ulaske i pitanja.', 'The session is closed to new visitors and questions.')}</div>}
  <main className="psi-layout"><section className="psi-floor-area"><div className="psi-floor-heading"><span className="psi-tag">{T('Mapa susreta', 'Meeting map')}</span><span className="psi-count">{world.booths.length} {T('štandova', 'booths')}</span></div><PixelHall ref={hallRef} world={world} position={pos} avatar={avatar} onMove={move} disabled={Boolean(modal)} en={en} onInteract={()=>{if(activeBooth&&!busy)run(()=>choosePoster(activeBooth));}}/>{error && <div role="alert" className="psi-error">{error}<button className="psi-muted-button" onClick={() => run(sync)}>{T('Pokušaj ponovo', 'Retry')}</button></div>}</section>
  <aside className="psi-side"><div className="psi-panel">{activeBooth ? <><div className="psi-tag">{T('Štand', 'Booth')} {String(activeBooth.number).padStart(2, '0')}</div><h2>{activeBooth.title}</h2><p>{activeBooth.presenter}</p><div className="psi-row" style={{
                marginTop: 15
              }}><button disabled={busy} className="psi-primary" onClick={() => run(() => choosePoster(activeBooth))}>{T('Pogledaj poster', 'View poster')}</button>{canEdit(activeBooth) && <button onClick={() => {
                  setDraft({
                    ...activeBooth
                  });
                  setModal({
                    kind: 'edit',
                    booth: activeBooth
                  });
                }}>{T('Uredi', 'Edit')}</button>}</div><div className="psi-live-note">{activeBooth.meet_url?<button onClick={()=>setModal({kind:'meet',booth:activeBooth})}>{T('Razgovor u Meetu','Call in Meet')}</button>:T('Meet link nije dodijeljen.','No Meet link assigned.')}</div></> : <><div className="psi-tag">{T('Dobro došao u salu', 'Welcome to the hall')}</div><h2>{T('Koja te ideja zanima?', 'Which idea interests you?')}</h2><p>{T('Odaberi štand ili mu priđi na mapi.', 'Choose a booth or approach one on the map.')}</p></>}</div><div className="psi-tabs" role="group" aria-label={T('Prikaz', 'View')}><button aria-pressed={panel === 'booths'} onClick={() => setPanel('booths')}>{T('Štandovi', 'Booths')}</button><button aria-pressed={panel === 'questions'} onClick={() => setPanel('questions')}>{T('Razgovor', 'Conversation')}</button><button aria-pressed={panel === 'people'} onClick={() => setPanel('people')}>{T('Učesnici', 'People')}</button></div>{panel === 'booths' ? <div className="psi-panel"><input aria-label={T('Pretraži štandove', 'Search booths')} placeholder={T('Tema, naslov, prezentator…', 'Topic, title, presenter…')} value={query} onChange={e => setQuery(e.target.value)} /><div className="psi-booth-list">{visibleBooths.map(b => <button className="psi-booth-card" key={b.number} aria-current={b.number === activeBooth?.number} disabled={busy} onClick={() => run(() => go(b))}><span className="psi-booth-no">{String(b.number).padStart(2, '0')}</span><span><strong>{b.title}</strong><small>{b.presenter} · {b.topic}</small>{Boolean(b.fictional) && <small className="psi-fictional">{T('Fiktivan primjer', 'Fictional example')}</small>}</span></button>)}</div></div> : panel === 'people' ? <div className="psi-panel">{world.participants.map(p => <div className="psi-row psi-spread" key={p.id} style={{
              padding: '9px 0',
              borderBottom: '1px solid #eff2eb'
            }}><span className="psi-avatar-toolbar"><PixelAvatar avatar={p.avatar||{shirt:p.color}} size={24}/>{p.name}</span><span className="psi-note">{p.booth ? `${T('Štand', 'Booth')} ${p.booth}` : T('U sali', 'In hall')}{p.hand ? ' · ' + T('ruka', 'hand') : ''}</span></div>)}</div> : <div className="psi-chat">{!activeBooth ? <p className="psi-note">{T('Uđi u štand da postaviš pitanje.', 'Enter a booth to ask a question.')}</p> : <><div className="psi-row psi-spread"><strong>{T('Pitanja uz poster', 'Poster questions')}</strong><button className="psi-muted-button" aria-pressed={handUp} onClick={() => {
                  hand.current = !handUp;
                  setHandUp(!handUp);
                  run(sync);
                }}>{handUp ? T('Spusti ruku', 'Lower hand') : T('Podigni ruku', 'Raise hand')}</button></div><div className="psi-questions">{world.self.booth !== activeBooth.number ? <p className="psi-note">{T('Povezivanje sa štandom…', 'Connecting to booth…')}</p> : !world.questions.length ? <p className="psi-note">{T('Ovdje počinje razgovor. Postavi prvo pitanje.', 'Start the conversation. Ask the first question.')}</p> : world.questions.map(q => <article className="psi-question" key={q.id}><strong>{q.author}</strong><p>{q.body}</p>{q.answer && <p className="psi-answer">{q.answer}</p>}{Boolean(q.resolved) && <span className="psi-count">{T('Odgovoreno', 'Answered')}</span>}{canEdit(activeBooth) && <button className="psi-muted-button" onClick={() => {
                    setAnswer(q.answer || '');
                    setModal({
                      kind: 'answer',
                      question: q
                    });
                  }}>{T('Odgovori', 'Answer')}</button>}</article>)}</div><form onSubmit={e => {
                e.preventDefault();
                run(async () => {
                  if (flight.current) await flight.current;
                  const w = await sync();
                  if (w.self.booth !== activeBooth.number) throw new Error('Priđi štandu pa pokušaj ponovo.');
                  await api('question', {
                    session: session.session,
                    text: question
                  });
                  setQuestion('');
                  await sync();
                });
              }}><label>{T('Tvoje pitanje', 'Your question')}<textarea maxLength={700} value={question} onChange={e => setQuestion(e.target.value)} placeholder={T('Šta želiš saznati?', 'What would you like to know?')} /></label><button className="psi-primary psi-wide" disabled={busy || !online || !question.trim() || !world.event.is_open}>{T('Pošalji pitanje', 'Send question')}</button></form></>}</div>}</aside></main></>}

  {modal && <div className="psi-modal-overlay" onKeyDown={e => {
      if (e.key === 'Escape') modalClose();
      if (e.key === 'Tab') {
        const controls = Array.from(e.currentTarget.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')).filter(el => el.getClientRects().length);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }}><section className="psi-modal" role="dialog" aria-modal="true" aria-label={modal.booth?.title || T('PSI radnja', 'PSI action')}><div className="psi-modal-head"><strong>{['join','create','manage','profile'].includes(modal.kind) ? T('Tvoj lik', 'Your avatar') : modal.kind === 'answer' ? T('Odgovori na pitanje', 'Answer question') : modal.booth?.title}</strong><button ref={closeRef} onClick={modalClose}>{T('Zatvori', 'Close')}</button></div><div className="psi-modal-body">{['join','create','manage','profile'].includes(modal.kind) ? <form className="psi-join" onSubmit={e=>{
 e.preventDefault();run(async()=>{
  if(modal.kind==='profile'){
   const owned=currentSession.current;
   const next=await api('profile',{session:owned,name:joinName,avatar:avatarDraft});
   if(owned!==currentSession.current)return;
   setAvatar(normalizeAvatar(next.self.avatar));setWorld(next);modalClose();
  }else if(modal.kind==='create')await begin('create',{name,count,nameTag:joinName,avatar:avatarDraft});
  else if(modal.kind==='manage')await begin('manage',{eventId:modal.event.id,nameTag:joinName,avatar:avatarDraft});
  else await begin('join',{eventId:modal.event.id,name:joinName,color:avatarDraft.shirt,avatar:avatarDraft,invite});
 });
}}><h2>{modal.event?.name|| (modal.kind==='profile'?T('Tvoj lik u sali','Your character in the hall'):name)}</h2><label>{T('Ime u sali','Your name in the hall')}<input value={joinName} onChange={e=>setJoinName(e.target.value)} maxLength={40} required autoComplete="off"/></label><AvatarEditor value={avatarDraft} onChange={setAvatarDraft} en={en}/>{modal.kind==='join'&&<label>{T('Pozivnica za prezentatora (opcionalno)','Presenter invitation (optional)')}<input type="password" value={invite} onChange={e=>setInvite(e.target.value)} autoComplete="off"/></label>}<p className="psi-note">{T('Učesnici vide tvoje ime i lik.','Participants see your name and avatar.')}</p><button className="psi-primary" disabled={busy||!joinName.trim()}>{modal.kind==='profile'?T('Sačuvaj lika','Save avatar'):T('Uđi u salu','Enter hall')}</button></form> : modal.kind === 'meet' ? <div className="psi-meet-prompt"><h2>{T('Razgovor uz poster','Poster conversation')}</h2><p>{T('Poziv se otvara u Google Meetu. PSI ne uključuje mikrofon.','The call opens in Google Meet. PSI does not turn on your microphone.')}</p><a className="psi-meet-link psi-primary" href={modal.booth.meet_url} target="_blank" rel="noopener noreferrer" onClick={modalClose}>{T('Pridruži se razgovoru','Join conversation')}</a><button disabled={busy} onClick={()=>run(()=>choosePoster(modal.booth))}>{T('Samo poster','Poster only')}</button></div> : modal.kind === 'poster' ? <div className="psi-poster-layout"><div>{!modal.booth.hasPoster ? <div className="psi-poster-stage"><DemoPoster booth={modal.booth} en={en} /></div> : !poster ? <div className="psi-empty">{T('Učitavanje postera…', 'Loading poster…')}</div> : <PosterViewer poster={poster} appId={appId} en={en} title={modal.booth.title} />}</div><div><div className="psi-tag">{modal.booth.topic}</div><h2 style={{
                margin: '12px 0'
              }}>{modal.booth.title}</h2><p className="psi-subtle">{modal.booth.presenter}</p>{Boolean(modal.booth.fictional) && <div className="psi-live-note">{T('Fiktivan primjer — nije stvarno PSI istraživanje.', 'Fictional example — not an actual PSI research project.')}</div>}<h3 style={{
                margin: '24px 0 12px'
              }}>{T('Sažetak', 'Abstract')}</h3><p className="psi-abstract">{modal.booth.abstract}</p><div className="psi-modal-footer"><button className="psi-primary" onClick={() => run(async () => {
                  const booth = modal.booth;
                  modalClose();
                  await go(booth);
                })}>{T('Priđi štandu i pitaj', 'Enter booth and ask')}</button></div></div></div> : modal.kind === 'edit' && draft ? <form onSubmit={e => {
            e.preventDefault();
            run(async () => {
              await api('edit-booth', {
                session: session.session,
                booth: modal.booth.number,
                ...draft,
                fictional: Boolean(draft.fictional)
              });
              await sync();
              modalClose();
            });
          }}><div className="psi-edit-grid">{[['title', T('Naslov', 'Title'), 140], ['presenter', T('Prezentator / tim', 'Presenter / team'), 80], ['topic', T('Oblast', 'Topic'), 60]].map(([key, label, max]) => <label key={key}>{label}<input value={draft[key]} maxLength={max} required onChange={e => setDraft({
                  ...draft,
                  [key]: e.target.value
                })} /></label>)}<label>{T('Vrsta sadržaja', 'Content type')}<select value={draft.fictional ? 'demo' : 'real'} onChange={e => setDraft({
                  ...draft,
                  fictional: e.target.value === 'demo'
                })}><option value="demo">{T('Fiktivan primjer', 'Fictional example')}</option><option value="real">{T('Vlastito istraživanje', 'Original research')}</option></select></label></div>{session.role==='organizer'&&<label>{T('Google Meet link za ovaj štand','Google Meet link for this booth')}<input type="url" inputMode="url" autoComplete="off" value={draft.meet_url||''} placeholder="https://meet.google.com/…" maxLength={200} onChange={e=>setDraft({...draft,meet_url:e.target.value})}/><small>{T('Ostavi prazno ako nema poziva.','Leave empty if there is no call.')}</small></label>}<label>{T('Sažetak istraživanja', 'Research abstract')}<textarea maxLength={6000} value={draft.abstract} onChange={e => setDraft({
                ...draft,
                abstract: e.target.value
              })} /></label><button className="psi-primary" disabled={busy}>{T('Sačuvaj izmjene', 'Save changes')}</button><label>{T('Postavi poster (PDF, PNG ili JPEG · do 4 MB)', 'Upload poster (PDF, PNG or JPEG · up to 4 MB)')}<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={upload} /></label><p className="psi-note">{T('Poster se sprema na privatni server događaja i vide ga učesnici ove sale.', 'The poster is stored on the private event server and visible to this hall’s participants.')}</p>{session.role === 'organizer' && <div className="psi-modal-footer"><button type="button" disabled={busy} onClick={() => run(async () => {
                const r = await api('invite', {
                  session: session.session,
                  booth: modal.booth.number
                });
                setInvite(r.invite);
              })}>{T('Pripremi pozivnicu za prezentatora', 'Prepare presenter invitation')}</button>{invite && <p className="psi-note">{T('Pozivnica je pripremljena. Ne objavljuj je javno.', 'Invitation prepared. Keep it private.')}<input readOnly autoComplete="off" spellCheck={false} value={invite} aria-label={T('Privatna pozivnica', 'Private invitation')} /></p>}</div>}</form> : modal.kind === 'answer' ? <form onSubmit={e => {
            e.preventDefault();
            run(async () => {
              await api('answer', {
                session: session.session,
                id: modal.question.id,
                answer,
                resolved: true
              });
              await sync();
              modalClose();
            });
          }}><p>{modal.question.body}</p><label>{T('Odgovor', 'Answer')}<textarea value={answer} maxLength={1500} onChange={e => setAnswer(e.target.value)} required /></label><button className="psi-primary" disabled={busy}>{T('Sačuvaj odgovor', 'Save answer')}</button></form> : null}{error && <div className="psi-error" role="alert">{error}</div>}</div></section></div>}
  </div>;
}
