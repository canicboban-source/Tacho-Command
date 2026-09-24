# TachoCommand V22.0 — priprema za Cloudflare

Ova grana je kandidat za objavu, ne potvrda da je proizvodnja ažurirana.

## Poznato proizvodno stanje

- Cloudflare Worker: `tachocommand`.
- Javni domeni: `tachocommand.com` i `www.tachocommand.com`.
- Administratorska putanja: `admin.tachocommand.com/*`.
- Proizvodna D1 baza: vezivanje `DB`, baza `tachocommand-prod`; njen ID je potvrđen na snimku Cloudflare D1 Overview od 2026-09-24. Pre objave ga treba postaviti u generisanu konfiguraciju, bez kopiranja probnog ID-a.
- U GitHub repozitorijumu su na snimku Settings → Actions potvrđeni nazivi tajni `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`. Njihovo postojanje ne potvrđuje da su token i dozvole još važeći.
- Na dostavljenom snimku najnovija verzija `c0c71562` menjala je tajnu; poslednja ručna objava koda bila je `42215e2f`.
- Automatska provera samo za čitanje (GitHub Actions, 2026-09-24, izvršavanje `35986421007`) potvrdila je da token radi, aktivna objava je `c65f116f-a703-46e7-92e9-27b64e6edacd`, a 100% zahteva ide na verziju `c0c71562-c697-41fd-b89f-52c2daf1928a`. Vezivanje `DB` pokazuje baš na bazu `tachocommand-prod`. Provera nije menjala proizvodnju.
- Izolovani Worker kandidata `tachocommand-v22-release-candidate` objavljen je kroz GitHub Actions izvršavanje `35986690322` kao verzija `d7e39a1b-fc92-4cc5-9570-5aaa59f7e1eb`. Adresa je `https://tachocommand-v22-release-candidate.canicboban.workers.dev`. Izgradnja, testovi i HTTP provere početne strane, `/app`, manifesta i servisnog Workera su prošli. Nema vezu sa proizvodnom bazom, pa demo i administratorski podaci na toj adresi nisu test proizvodne baze. `tachocommand.com` nije menjan.
- Terenska provera 24.09.2026: sopstvena kartica vozača je ponovo očitana na trećem tahografu; ime i poslednje cifre kartice su provereni na prikazu, 56 dana i vremena se slažu. Ispravka je sklonila budući 25.09. iz lokalne istorije; 24.09. je prvi. Kolegina kartica još nije potvrđena. Kandidat je ponovo objavljen na istoj izolovanoj adresi kroz uspešno izvršavanje `36007351023`.
- Naredni kandidat dodaje držanje ekrana aktivnim tokom LIVE povezivanja i čitanja kartice preko Screen Wake Lock API-ja; ako telefon odbije dozvolu, UI prikazuje upozorenje. Landing ostaje na SR/EN/DE, navodi tri terenski proverena tahografa i vodi pravo u aplikaciju. Izolovana objava je prošla kroz izvršavanje `36008680505`, uključujući svih 279 testova i HTTP provere. Vozač je potom potvrdio da se ekran nije ugasio i da je očitavanje sopstvene kartice ponovo uspelo. Ovo je terenska potvrda konkretnog telefona i tahografa.
- Javni kandidat dobija oznaku `1.0.0-beta.1`; `V22.0` ostaje interna oznaka motora. Pravila desetodnevnog praćenja su u `docs/release/1.0.0-beta.1-freeze.md`. Period počinje stvarnom objavom na proizvodnom domenu, ne objavom probnog Workera.

## Sadržaj kandidata

- Oznaka `V22.0`; početna strana na srpskom, engleskom i nemačkom sa čitljivijim tekstom i proverljivim tvrdnjama o 56 dana i DTCO 4.1a.
- Instalacija sa sopstvenog domena i postojećim identitetom aplikacije; uklonjene oznake privatnog pregleda iz poziva za instalaciju.
- Pregled očitavanja i zbirni ishod očitavanja u administratorskom pregledu. Telemetrija ne šalje bajtove kartice ni identitet vozača; nasumični identifikatori sesije se ne proglašavaju potpuno anonimnim.
- Niske funkcije transporta kartice ostaju netaknute; dodatne promene prikaza potiču iz kandidata V22.

## Pre objave

1. Provere kandidata: izgradnja uspešna; svih 279 automatskih testova prolazi. Provera koda prolazi bez grešaka (dva ranija upozorenja). Držanje ekrana budnim je potvrđeno na jednom Android telefonu tokom očitavanja; automatizovani test sam po sebi to ne potvrđuje.
2. Potvrditi da GitHub tajne važe i upotrebiti stvarni Cloudflare nalog i identifikator baze `tachocommand-prod`. Lokalna Vite postavka sadrži samo probni ID `00000000-0000-4000-8000-000000000000` i naziv `site-creator-d1`: nije pogodna za proizvodnu objavu.
3. Pripremljena `.github/workflows/v22-production-release.yml` pokreće se tek posebnim markerom na namenskoj grani. Ona pre promene proverava sadašnju aktivnu verziju i produkcionu D1 bazu, gradi i testira kandidat, postavlja novu verziju bez saobraćaja, proverava vezivanja, pa tek tada prenosi saobraćaj. Pri neuspešnoj završnoj proveri vraća zabeleženu staru verziju. Izdavač je fizičko lice; poslovna registracija i naplata nisu aktivne. Pre prodaje je potrebna posebna provera pravnih i poslovnih podataka.
4. Otvoriti baš izolovanu V22.0 adresu na Android telefonu i ponoviti proveru instalacije, povezivanja i očitavanja na tahografu; ranija terenska potvrda V22 ne potvrđuje automatski ovaj novi kandidat.

Cloudflare tabla je u dostupnom automatizovanom pregledaču 2026-09-24 ostala na stranici za proveru posetioca. GitHub Actions provera je preko Cloudflare API-ja potvrdila aktivnu verziju, token i bazu, pa se poznata verzija može koristiti kao polazna tačka za plan povratka. Tačan izvor proizvodnog Workera i dalje nije potvrđen kao jednak GitHub `main`: postojeći dokument `docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md` na to upozorava. Ne zamenjivati živi Worker dok ne postoji proverena nova verzija i dokumentovan korak vraćanja na `c0c71562-c697-41fd-b89f-52c2daf1928a`.

Ne objavljivati probnu konfiguraciju baze na proizvodnju.
