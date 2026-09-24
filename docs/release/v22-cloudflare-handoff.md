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

## Sadržaj kandidata

- Oznaka `V22.0`; početna strana na srpskom, engleskom i nemačkom sa čitljivijim tekstom i proverljivim tvrdnjama o 56 dana i DTCO 4.1a.
- Instalacija sa sopstvenog domena i postojećim identitetom aplikacije; uklonjene oznake privatnog pregleda iz poziva za instalaciju.
- Pregled očitavanja i anonimni ishod očitavanja u administratorskom pregledu. Telemetrija ne šalje bajtove kartice ni identitet vozača.
- Niske funkcije transporta kartice ostaju netaknute; dodatne promene prikaza potiču iz kandidata V22.

## Pre objave

1. Provere kandidata: izgradnja uspešna; svih 276 automatskih testova prolazi posle usklađivanja zastarelih očekivanja probne verzije. Provera koda prolazi bez grešaka (dva ranija upozorenja). To nije zamena za test na telefonu i tahografu.
2. Potvrditi da GitHub tajne važe i upotrebiti stvarni Cloudflare nalog i identifikator baze `tachocommand-prod`. Lokalna Vite postavka sadrži samo probni ID `00000000-0000-4000-8000-000000000000` i naziv `site-creator-d1`: nije pogodna za proizvodnu objavu.
3. Sačuvati prethodnu verziju Workera za povratak, objaviti na postojećem Workeru, pa proveriti domen, vezivanje baze, instalaciju i administratorsku putanju.
4. Ponoviti proveru na telefonu i tahografu pri sledećem terenskom terminu; terenska potvrda postojećeg čitanja ne potvrđuje automatski novu objavu.

Cloudflare tabla je u dostupnom automatizovanom pregledaču 2026-09-24 ostala na stranici za proveru posetioca. GitHub Actions provera je preko Cloudflare API-ja potvrdila aktivnu verziju, token i bazu, pa se poznata verzija može koristiti kao polazna tačka za plan povratka. Tačan izvor proizvodnog Workera i dalje nije potvrđen kao jednak GitHub `main`: postojeći dokument `docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md` na to upozorava. Ne zamenjivati živi Worker dok ne postoji proverena nova verzija i dokumentovan korak vraćanja na `c0c71562-c697-41fd-b89f-52c2daf1928a`.

Ne objavljivati probnu konfiguraciju baze na proizvodnju.
