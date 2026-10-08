# Release boundaries

This is private release preparation, not a published Store listing or public hall.

## License

Original PSI source is MIT, chosen by the owner on 2026-10-08. See LICENSE.
This does not relicense third-party code or assets. Preserve PDFJS_LICENSE and
all licenses in assets/pdf, including CMaps, fonts and decoders. React, the
bundled PDF.js runtime and optional inactive audio dependencies retain their
own licenses. Exclude development dependencies from the distributed runtime.

## Möbius Store

Publish only a reviewed source package and its truthful listing. A Store
installation does not make an existing hall accessible to anonymous visitors.
The Store supports community publication of an accepted local app through
the connected GitHub account: its guarded publication operation creates a
public repository snapshot and requests community admission. This does not
require push rights to the curated catalog. Source publication and Store
admission are separate outcomes: inspect the saved publication state after
partial failure and do not equate a public repository with a live listing.
Curated catalog admission is a different route. No public repository, fork,
push, PR or community listing is authorized by this document.

The accepted manifest must include a truthful Store tagline, description and
1–5 actual screenshots under static/store/. Do not use an icon as a screenshot
or claim an offline preview proves installed multiplayer/mobile behavior.

Before staging: review every source file and the complete public diff, preserve
third-party notices, remove private event details from the public documentation,
and exclude SQLite databases, backups, uploaded posters, session data, logs,
chat files, credentials and unrevised local Git history. Only explicitly
fictional content may appear in public examples or screenshots. Review the
exact repository, source revision and public text with the owner before sending.

## Guest hosting prerequisites

The present package is a Möbius app, not a deployable standalone website.
A static upload of index.jsx or its preview is not a shared guest hall.
Confirm the hosting provider and control panel, supported Python version and
application startup method, a durable SQLite directory outside the public web
root, HTTPS, request/body limits (poster size up to 4 MiB plus JSON encoding),
process limits and backup/recovery before implementing a deployment adapter.
If Python is unavailable, reassess the runtime with the owner; do not silently
replace the service or assert PHP/MySQL compatibility.

Use a separate staging path first. Do not overwrite an existing website or
reuse its database without exact permission and a verified recovery copy.
Any later host credential goes through a sealed-input card and a narrow,
reviewed consumer; never through chat, logs or command arguments.

## Required public-access review (not enabled)

- Keep all existing events private by default. The organizer explicitly opts
  a selected event into guest access; explain that its posters, display names
  and booth questions become visible to anyone allowed into that public room.
- Separate organizer/private authority from guest authority. Public callers
  cannot create or administer events, change Meet links, issue presenter
  invitations or use private session credentials as a privilege shortcut.
- Guest sessions may act only as their own visitor in the chosen shared event.
  Revoking sharing denies guest access without deleting the private event.
- Preserve booth-scoped questions, real presence, atomic invitation handling
  and memory-only session bearers. Never put session credentials into links.
- Test two actual guest clients, cross-event isolation, privileged-route denial,
  sharing revocation, upload limits and the expected shared-WiFi load.
- Built-in anonymous Möbius service traffic is limited to 60 requests/minute
  per IP. Current 4.5-second polling is unsuitable for an unrestricted group
  behind one shared network. Do not weaken the platform limit to bypass this.

Google Meet is an external call opened on user action, not embedded PSI audio.
Moving booths or leaving PSI does not end a Meet call. No live audio provider
or microphone capability is activated by this release preparation.
