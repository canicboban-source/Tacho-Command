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

1. Provere kandidata: izgradnja uspešna; svih 276 automatskih testova prolazi posle usklađivanja zastarelih očekivanja probne verzije. Provera koda prolazi bez grešaka (dva ranija upozorenja). To nije zamena za test na telefonu i tahografu.
2. Upotrebiti stvarni Cloudflare nalog i identifikator baze `tachocommand-prod`. Lokalna Vite postavka sadrži samo probni ID `00000000-0000-4000-8000-000000000000` i naziv `site-creator-d1`: nije pogodna za proizvodnu objavu.
3. Sačuvati prethodnu verziju Workera za povratak, objaviti na postojećem Workeru, pa proveriti domen, vezivanje baze, instalaciju i administratorsku putanju.
4. Ponoviti proveru na telefonu i tahografu pri sledećem terenskom terminu; terenska potvrda postojećeg čitanja ne potvrđuje automatski novu objavu.

Cloudflare tabla je u dostupnom automatizovanom pregledaču 2026-09-24 ostala na stranici za proveru posetioca. Zato ID proizvodne D1 baze, trenutni tačni izvor proizvodnog Workera i povratak na staru verziju nisu potvrđeni kroz nalog. Postojeći dokument `docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md` upozorava da se izvor trenutno objavljenog proizvoda ne podudara nužno sa GitHub `main`. Ne zamenjivati živi Worker pre poređenja tih verzija.

Ne objavljivati probnu konfiguraciju baze na proizvodnju.
