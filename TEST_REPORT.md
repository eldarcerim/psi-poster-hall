# Store snimci · 8. oktobar 2026.

Vlasnik je dostavio stvarne desktop snimke instalirane aplikacije. Dva pregledana snimka pokazuju pixel salu sa šest fiktivnih tema i pregled jasno fiktivnog demo postera. Koriste se kao Store materijal; slika uređivanja lika s ličnim imenom nije uključena.

Ovo potvrđuje izgled prikazanih ekrana, ne ponašanje Android uređaja, Google Meet prelazak, PDF canvas ili dijalog izbora datoteke. Ranije navedene granice provjere ostaju za te tokove. Privatni događaji, pitanja i posteri nisu uključeni u javni izvor.

---

# Meet/mobilna revizija · 8. oktobar2026.

- **40/40 testova:**19 Python +21 JavaScript. Meet URL validacija/rollback, dodjeljivanje samo organizatoru, prazne početne veze, jednom po dolasku i ponovno nakon izlaska, čekanje potvrde štanda, originalna bitmap slova s BS akcentima.
- Produkcijski compiler i privatni apply app11 uspješni. validate-app ima jedno heurističko upozorenje za literalni Meet URL u placeholderu. To nije fetch/embed; dozvoljen je samo korisnički target=_blank link, uz postojeći platform sandbox. Validator/sigurnost nisu mijenjani.
- Offline DOM test **stvarnog App-a** na360/800px: upravljanje/lik, automatski Meet prozor, tačan href/novi tab/noreferrer, Samo poster, bez ponovnog prozora nakon zatvaranja, puna rezolucija canvasa i52px kontrolne deklaracije. Bez vanjskih zahtjeva; nije pravi Android browser test.
- Samostalni pregled ponovo buildan i DOM hodanje/izbor lika prošli.
- Stvarni privatni scoped servis: dvije sesije, izgled/profile/Q&A i postojeće granice; dodijeljeni Meet link vide učesnici, prezentator ga ne može zamijeniti. Fiktivni testni događaj očišćen.
- Prije Meet migracije nova privatna SQLite online kopija. Ranije kolone svih događaja/štandova/pitanja ostale jednake; novo meet_url prazno za postojeće štandove. Postojeći PDF potpuno isti. Privatni događaj nije otvoren gostima; service.access self.
- Android tap/Meet aplikacija, stvarni mobilni raspored i screenshot nisu potvrđeni. Nema stvarnog Meet poziva ni izmjena platformskih granica. Public hosting i Store su još otvoren posao.

Ponovi: `python3 -m unittest test_service test_pixel`; `node --test tests/*.test.mjs pixel-world.test.mjs`; `npm run test:meet-ui` u okruženju s dev zavisnostima i Möbius PDF.js putem PSI_NODE_MODULES.

---

Prethodni pixel izvještaj:

# PSI — testni izvještaj

## Privatna pixel revizija · 7. oktobar 2026.

**Aplikacija11 je privatno ažurirana kroz apply_app, bez upozorenja.** Integriran je dostavljeni PSI-pixel-review-patch.zip, ne nova implementacija od nule. Nema javne objave, aktivnog audija, novih naloga ili izmjena sandboxa.

### Ponovljene provjere

- **36/36 testova:**18 Python (`test_service`, `test_pixel`) i18 JavaScript (`tests/*.test.mjs`, `pixel-world.test.mjs`). Broj15 JS iz dostavljenog izvještaja zamijenjen je stvarnim brojem18, koji uključuje postojeće PDF testove.
- Servis: actor/role ovlasti, izolacija događaja i štanda, pozivnice i konkurentno jednokratno korištenje, SQL parametri, trajnost podataka, limiti, posteri; izgled kroz dvije sesije, vlastiti profil bez promjene uloge, rollback nevažećeg izgleda, smjer, prepreke i24 ulaza.
- JS: bearer samo u zaglavlju, session u tijelu/memoriji, serijalizovan transportni budžet najmanje1500ms,429 backoff i cancel; PDF/font/resource provjere; isti reader koji koristi upload handler; neaktivni audio adapter; izgled, kolizije, dugi korak i putanje za6/24 štanda.
- Möbius **produkcijski compiler**: validate-app bez grešaka/upozorenja. PDF.js main i kompatibilni worker handler ugrađeni su u modul, ne ostavljeni kao vanjska zavisnost. Privatni apply uspješan.
- **Stvarni instalirani servis:** dva nezavisna app-scoped klijenta vide različite izglede, izmjenu vlastitog profila, prisustvo i Q&A. Smjer se čuva, solidna pozicija i promjena uloge kroz profil odbijaju. Tuđi štand/poster, one-use pozivnica, role granice, poster byte round-trip, privatni/javni ulazi i leave prolaze. Očišćen samo vlastiti označeni automatski događaj.
- **Stvarna baza:** prije promjene napravljena dosljedna privatna SQLite online kopija. Poslije primjene i smoke testa svi raniji događaji, štandovi i pitanja poređeni red po red i ostali isti. Appearance/direction polja aktivna. Kopija baze nije u izvornom ZIP-u.
- **Očuvanje postojećeg postera:** stvarni privatni scoped servis vratio je iste bajtove kao prije ažuriranja. Poster nije zamijenjen. Privatni naziv fajla, identifikator događaja i sam dokument nisu dio javnog izvora.
- Isti priloženi PDF lokalno parsiran i jedna stranica stvarno canvas-renderovana istim legacy PDF.js runtime-om, bez vanjskog slanja i raster izvoza.
- **Offline DOM pregled:** stvarni PixelHall/AvatarEditor moduli: izbor kape, ulazak, hodanje do postera, otvaranje/zatvaranje, držanje tipke, stajanje nakon otpuštanja i zadržan izbor lika. Nema mreže. Nije stvarni browser/touch test.
- Prethodna provjera4. oktobra: ponovljena migracija kopije stvarne baze očuvala trajne tabele;1.920 determinističkih tačaka za1–24 štanda imalo iste client/server kolizije. Dva opcionalna LiveKit SDK testa prošla2. oktobra, ali nisu ponovo pokrenuta niti uračunata u današnjih36.

### Korisnički UI — ranija verzija

Raniji prikaz imao je zasebnu korisničku provjeru prisustva i izolacije pitanja u dva taba. Ovo nije potvrda novog pixel prikaza. Privatne nazive sesija i detalje njihovog sadržaja ne objavljujemo.

### Poštena granica provjere

Novi instalirani pixel izgled, narrow/phone raspored, stvarni dodir/blur/prekid putanje, dvije browser kartice s različitim likovima, PDF canvas/zoom u iframeu i UI picker **još traže korisnički pregled**. Nema novog screenshot-a. Ograničeni pokušaj browser provjere nije uspio; više pokušaja nije rađeno.

UI filechooser ranije nije slao događaj uz greške browser proširenja. Upload reader/handler put i privatni servis testirani odvojeno; to nije potvrda dijaloga izbora. Sandbox ostaje isti.

### Sigurnost i granice

service.access ostaje **self**, bez anonimnog gosta. Lokalno kretanje ne šalje zahtjeve svaki frame; polling oko4,5 sekundi. Server odbija solidne krajnje pozicije, ali nije real-time anti-cheat sistem. Nema mjerenog maksimuma konkurentnih tabova. Mikrofon isključen; audio adapter neaktivan. JWT expiry ograničava prvo spajanje, pa budući audio zahtijeva izričit disconnect i gateway revocation, ne samo kratak JWT.

### Ponovi

```sh
python3 -m unittest test_service test_pixel
node --test tests/*.test.mjs pixel-world.test.mjs
python3 /data/platform/backend/scripts/validate-app.py /data/apps/psi-poster-hall
# Samo u odobrenom agent okruženju; vlastiti označeni fixture:
python3 tests/live_smoke.py --app-id 11
# Nakon npm install za testne zavisnosti:
npm run preview:build
npm run preview:test
```
