# PSI · Poster sesije

**Privatna pixel/Meet revizija.** Prostor za Projekat studentskih istraživanja: originalna PSI ikona, tamnoplavi okvir, topla drvena pixel sala i BS/EN. Organizator bira **1–24 štanda**. Zajedničko prisustvo, izgled likova i pitanja dolaze sa stvarnog privatnog servera. Demo teme su fiktivne; nema izmišljenih posjetilaca.

## Koristi aplikaciju

Otvori PSI među instaliranim Möbius aplikacijama.

1. Kreiraj salu ili izaberi **Uđi / Upravljaj**. Prije ulaska napiši ime i izaberi ten, kosu/frizuru, majicu i hlače. **Moj lik** mijenja vlastito ime i izgled.
2. Kreći se držanjem strelica/WASD, klikom na prolaz ili dodirnim strelicama. Izbor iz liste vodi lika hodanjem, ne teleportom. Kamera prati lika; **Cijela mapa** daje pregled. Drugi prozor dobija novo stanje približno svakih4,5 sekundi plus mreža.
3. Priđi štandu i izaberi **Pogledaj poster** ili E. Razgovor prikazuje pitanja samo tog štanda. Organizator odgovara/uređuje sve štandove; prezentator samo dodijeljeni.
4. PDF/PNG/JPEG do4 MiB: uvećanje50–300%, scroll, izbor PDF stranice. PDF se crta lokalno; nema slanja van sale ili direktnog iframe preuzimanja. Sažetak je zaseban čitljiv tekst.
5. Organizator priprema jednokratnu prezentatorsku pozivnicu za štand, važeću24 sata. Nova poništava raniju neiskorištenu za isti štand. Pozivnica ne daje javnom gostu prijavu u Möbius.
6. Nakon reloada ponovo uđi: organizator **Upravljaj**, prezentator nova pozivnica. Session samo u memoriji, najviše8 sati; prisutnost nestaje nakon oko20 sekundi bez javljanja.

**PSI ne uključuje mikrofon. Razgovor se otvara u zasebnom Google Meet pozivu. Igrice samo Uskoro.** Oba taba moraju biti prijavljena u ovu privatnu Möbius instalaciju.

## Izvor i pregled

Kanonski izvor `psi/`; instalirani paket `/data/apps/psi-poster-hall`. Korijenski manifest je source preview. Primjenjuje se **psi paket**, ne preview omotač. apply_app čuva lokalnu reviziju, bez Store objave.

`preview/PSI-pixel-preview.html` je samostalan pregled stvarnih pixel modula: jedan lokalni lik, jasno fiktivni štandovi, bez mreže, drugih prisutnih, Q&A baze ili PDF upload-a. Nije zajednička instalirana sala.

```sh
python3 -m unittest test_service test_pixel
node --test tests/*.test.mjs pixel-world.test.mjs
# npm install instalira razvojne zavisnosti za samostalni pregled:
npm run preview:build
npm run preview:test
```

Ručni `tests/live_smoke.py --app-id 11` traži odobreno agent okruženje, koristi scoped app bearer i čisti samo vlastiti označeni testni događaj. Ne radi automatski pri otvaranju. `PSI_NODE_MODULES` može pokazivati na kompletan Möbius frontend za JS/PDF testove.

Službeni PDF.js6.3.289 legacy main i worker handler ugrađeni u isti modul. CMap/font/decoder resursi i licence u `assets/pdf/`; nema CDN-a. Session nije u logovima, URL-u ili browser storage-u. service.access je self. Privatni posteri, baze i identiteti nisu u izvornom ZIP-u.

**Provjereno:**40 testova (19 Python +21 JS), produkcijski build, privatni servis s dva klijenta, izgled/profile/Q&A/ovlasti i Meet ovlasti, očuvanje podataka i postojećeg PDF-a. **Korisnički pregled ostaje:** novi browser prikaz, dodir/telefon, dvije UI kartice s likovima, PDF canvas/zoom i picker. Ranija vlasnikova UI potvrda odnosi se na prethodni izgled.

Detalji: [testovi](TEST_REPORT.md), [ograničenja](KNOWN_LIMITATIONS.md), [integracija](INTEGRATION.md), [audio](AUDIO_INTEGRATION.md), [Store nacrt](STORE_DRAFT.md). Originalni PSI kod je pod [MIT licencom](LICENSE); licence tuđeg koda/resursa ostaju sačuvane. [Granice objave i hostinga](PUBLICATION.md).

## Meet i mobilna revizija · 8. oktobar2026.

Organizator u uređivanju svakog štanda dodaje Google Meet link sa kodom. Prazno polje znači da nema poziva. Pri dolasku u štand pojavljuje se **Pridruži se razgovoru / Samo poster**; isti prozor se ne ponavlja pri svakom osvježavanju. Razgovor se može ponovo otvoriti iz bočnog panela. PSI ne stvara Meet sastanke i ne šalje Googleu postere, pitanja ili session bearer.

Meet se otvara pritiskom, kao zaseban tab/aplikacija. Dostupnost poziva, prijava i dopuštanje ulaska zavise od Google Meeta i organizatora. Promjena štanda ili napuštanje PSI sale **ne prekida Meet poziv**; napusti ga i u Meetu.

Mobilno: veće dodirne strelice i izbori lika, krupniji inputi, prilagodljiv prozor, kraći UI; originalna 5x7 pixel slova na oštrijem canvasu, veći naslovi. Potvrđena DOM ponašanja na360/800px i servisne ovlasti; stvarni Android/Meet app prijelaz još nije potvrđen.

**Pristup gostima i Möbius Store objava još nisu aktivirani.** Postojeće sale ostaju privatne. Ugrađena javna servisna ruta ima60 zahtjeva/min poIP-u: više telefona na istoj mreži može iscrpiti limit. MIT je odabran; potvrda mogućnosti gostujućeg hostinga i pregled tačnog javnog paketa još prethode objavi. Nema zaobilaženja platformskih granica.
