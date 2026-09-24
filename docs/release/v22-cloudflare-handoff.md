# TachoCommand V22.0 — priprema za Cloudflare

Ova grana je kandidat za objavu, ne potvrda da je proizvodnja ažurirana.

## Poznato proizvodno stanje

- Cloudflare Worker: `tachocommand`.
- Javni domeni: `tachocommand.com` i `www.tachocommand.com`.
- Administratorska putanja: `admin.tachocommand.com/*`.
- Proizvodna D1 baza: vezivanje `DB`, baza `tachocommand-prod`.
- Na dostavljenom snimku najnovija verzija `c0c71562` menjala je tajnu; poslednja ručna objava koda bila je `42215e2f`.

## Sadržaj kandidata

- Oznaka `V22.0`; početna strana na srpskom, engleskom i nemačkom sa čitljivijim tekstom i proverljivim tvrdnjama o 56 dana i DTCO 4.1a.
- Instalacija sa sopstvenog domena i postojećim identitetom aplikacije; uklonjene oznake privatnog pregleda iz poziva za instalaciju.
- Pregled očitavanja i anonimni ishod očitavanja u administratorskom pregledu. Telemetrija ne šalje bajtove kartice ni identitet vozača.
- Niske funkcije transporta kartice ostaju netaknute; dodatne promene prikaza potiču iz kandidata V22.

## Pre objave

1. Razrešiti 18 neuspešnih provera u celom skupu (258 od 276 prolazi). Među njima su očekivanja naziva i adrese probne verzije i provere izvornog puta očitavanja; proveriti svaku pre proizvodne objave.
2. Upotrebiti stvarni Cloudflare nalog i identifikator baze `tachocommand-prod`. Lokalna Vite postavka sadrži samo probni ID `00000000-0000-4000-8000-000000000000` i naziv `site-creator-d1`: nije pogodna za proizvodnu objavu.
3. Sačuvati prethodnu verziju Workera za povratak, objaviti na postojećem Workeru, pa proveriti domen, vezivanje baze, instalaciju i administratorsku putanju.
4. Ponoviti proveru na telefonu i tahografu pri sledećem terenskom terminu; terenska potvrda postojećeg čitanja ne potvrđuje automatski novu objavu.

Ne objavljivati probnu konfiguraciju baze na proizvodnju.
