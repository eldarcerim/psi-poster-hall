# Installed Möbius integration

Inspected actual platform revision **7c7f5a6**, 2 October 2026. No platform/sandbox edits, Store publication, external service activation or MAAK edits.

## Transport and access

`App({appId, token})` uses the app-scoped bearer supplied by Möbius, not owner auth. `transport.js` POSTs JSON to `/api/apps/${appId}/service/${operation}` with Authorization header, `credentials: omit`, `cache: no-store` and a 15s timeout. Bearers never enter URLs, localStorage, IndexedDB or analytics. App session bearers stay only in frame memory; SQLite stores SHA-256 digests, not clear bearers.

The installed json-v1 envelope supplies schema/method/path/body/public and trusted actor. `APP_STORAGE_DIR` comes from the service runtime. Service checks owner/app scope and access=write for every request; unknown/public/read actors are denied. Delegated callers cannot list/create/manage owner events. Roles/assignments in the body cannot elevate a session. The signed-in owner may deliberately manage private events; this is not an independently authenticated public-user system.

Manifest: `service.access: self`, no microphone or host capability grant, `offline_capable: false`. Anonymous access is blocked at the platform and service layers. No cross-app access or guest links are granted.

## State and SQL

Operations (all POST): events, create, join, manage, sync, leave, question, answer, settings, invite, edit-booth, poster, get-poster. Python standard library only. Parameterized SQL, foreign keys, WAL and BEGIN IMMEDIATE cover complete read-modify-write transactions. Invitation consumption and session creation commit together, including concurrent processes. Failed join leaves the invitation usable.

All state is event-scoped. Participant questions and poster reads require the occupied booth; presenters change/answer only their assigned booth and may retrieve that owned poster for editing; organizer may edit all booths. Same-event movement and Q&A are shared by separate service invocations, not browser-local simulated users.

Bounds: 1–24 booths, 20 saved events, 100 unexpired sessions/event, 3,000 saved questions/event, latest 100 questions for the occupied booth, six new questions/minute/session, 4 MiB/poster. The 100-session bound is admission control, NOT measured conferencing capacity. Expired sessions/invites/rate rows are cleaned. New invitation replaces the prior unused one for that booth. Saved research/questions are not automatically deleted. Booth count stays fixed per event; another layout means a new event.

## Poll budget and failures

The installed route limits requests to 120/minute/IP shared with other app-service use. All frame operations share a serialized minimum 1,500ms spacing: at most about 40/minute/frame, about 80/minute for two frames under continuous actions. Normal two-frame polling is about 27/minute plus actions. More tabs or other services can still exhaust the shared budget; no unlimited-capacity claim.

Poll again 4,500ms after completion, coalesce an existing sync, refresh when returning to a tab. Movement is coalesced, never sent per animation frame/keystroke. A 429 delays all subsequent operations 60s. Network failure shows disconnected state with last-known positions. Session expiry is eight hours and presence timeout is 20s. Unmount cancels transport; explicit leave expires session. Sudden close relies on presence expiry.

## Posters

Server checks MIME, size and file magic; SVG/HTML and remote poster URLs are not accepted. This is not antivirus or full document parsing. `readPosterFile()` is the exact UI upload reader and is tested with real File objects and binary data; this does not prove a browser opens its file chooser.

Viewer uses official PDF.js **legacy** main plus in-process WorkerMessageHandler from the SAME installed version, compiled into one module. Standard build compiled but the real canvas test failed on Uint8Array.toHex; official legacy builds fixed that without hand polyfills. No worker URL load, CDN, PDF iframe, download link, active annotations, external-link handler, XFA or PDF script execution. Canvas-only rendering caps raster work at 8M pixels/4096px side. Font-face/system-font evaluation disabled; local helper factory fetches only enumerated same-instance resources. useWasm=false avoids an extra CSP execution grant; local JS decoder fallbacks are packaged. Public static resources contain library code/fonts/decoders, NEVER uploaded posters.

PNG/JPEG have 50–300% enlargement and native scroll. Poster abstract remains readable. Password-protected/corrupt PDF gets a visible error, not a blank browser embed. Complex codec/device gesture coverage remains a limitation.

## Audio and preview

Installed audio.configured remains false; audio/ is dormant source, not imported by the app. See AUDIO_INTEGRATION.md. Project root builds the same source with a preview-only notice, without a scoped service bearer. Its compilation is not a multiplayer acceptance test.
