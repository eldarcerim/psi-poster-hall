> **7. oktobar 2026:** Pixel revizija privatno primijenjena u app11. Servisne provjere prošle; postojeće sale, posteri i pitanja očuvani. Novi pixel UI još nije korisnički potvrđen.

# Poznata ograničenja

- **Nema živog audija.** Mikrofon ostaje isključen. Adapter, ovlasti i revocation put postoje kao neaktivni kod; infrastruktura, odobreno media porijeklo i end-to-end audio izolacija još nisu aktivirani/testirani.
- **Privatna instalacija.** Dva prozora koriste isti prijavljeni Möbius. Pozivnica ne daje anonimnom gostu pristup platformi. Ne dijeli prijavu ili transport/session bearer.
- **UI potvrda:** vlasnik je potvrdio raniji prikaz i Q&A u dva taba. Novi editor, kamera/mapa, dvije kartice s različitim likovima, PDF canvas/zoom i telefon još traže korisnički pregled. Ograničeni pokušaj agent browser provjere nije uspio; ponavljanje nije planirano. Offline DOM simulacija nije browser acceptance.
- **Kretanje:** server odbija solidne krajnje pozicije i validira smjer/izgled. Nije real-time server fizika ili anti-cheat. Ostali likovi se interpoliraju između pollova i mogu vizuelno presjeći prepreku. Cijela mapa smanjuje detalje; lista zadržava čitljive naslove.
- **UI picker nije potvrđen.** Vlasnik nije dobio filechooser događaj za stvarni file input uz browser-extension greške; vanjski Möbius Attach files radi. Sandbox nije promijenjen. Testirana je funkcija koju handler koristi i odvojen serverski upload priloženog PDF-a, ne sam dijalog izbora.
- **Nije instant stream/offline.** Normalno oko 4,5 sekundi plus mreža, radnje mogu čekati. Pri prekidu veze prikazuje se zadnje poznato stanje. Dodatni tabovi/drugi servisi na istom IP-u mogu iscrpiti limit. Nema izmjerenog maksimuma konkurentnosti.
- **Reload traži novi ulazak.** Session namjerno nije sačuvan. Prezentator dobija novu pozivnicu, organizator koristi Upravljaj. Stara prisutnost nestaje nakon oko 20s. Nema trajnih korisničkih računa ili samostalnog presenter recovery-ja.
- **Broj štandova je fiksan po događaju.** Nema automatskog brisanja postera pri promjeni broja; kreira se druga sala.
- **Posteri:** do 4 MiB, PDF/PNG/JPEG. Zaključan/oštećen PDF prikazuje grešku. Ne obećavamo PDF forme, video, linkove, sve fontove/codece, direktno iframe preuzimanje ili custom pinch. Postoje zoom dugmad/keyboard, scroll i tekstualni sažetak.
- **Q&A:** 3.000 sačuvanih pitanja/event, zadnjih 100 u trenutnom štandu; nema izvoza privatnih istraživanja ili brisanja događaja u UI-ju ove verzije.
- **Store nacrt nije objava.** MIT je izabran za originalni PSI kod; licence tuđeg koda ostaju sačuvane. Gostujući pristup i media infrastruktura nisu aktivirani. Izvorni paket nema baze, postere korisnika, identitete ili kredencijale.

## Meet / gosti

- Meet je zaseban poziv, ne ugrađeni mikrofon. Prelazak štanda ili zatvaranje sale ne prekida vanjski poziv.
- Android otvaranje Meet aplikacije, dozvole i host admission još traže stvarni uređaj. Mobilne izmjene nisu tvrdnja o gotovoj Google Play aplikaciji.
- Gosti još nisu uključeni. Niska javna servisna granica na zajedničkoj Wi-Fi mreži zahtijeva izbor hostinga ili mali kontrolisani test. Nema obećanja neograničenog kapaciteta.
- Möbius Store objava nije izvršena. Potrebni pregledan javni izvor/licenca i prijava trgovini kroz dozvoljeni tok; privatni podaci ne idu u objavu.
