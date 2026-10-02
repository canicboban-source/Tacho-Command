# TachoCommand

Mobile-first PWA for professional truck and bus drivers: connect to a supported tachograph, read a driver card, and review activity on the phone.

**Current release: `2026.09.30-beta.3` — open, free beta.** No signup, email confirmation, purchase or configured beta expiry. The former 72-hour access policy is historical.

Documentation reviewed on **2026-10-01** against application source [`62220e78a161a6ec07e2f7cfdc5f651982cc4d00`](https://github.com/canicboban-source/Tacho-Command/commit/62220e78a161a6ec07e2f7cfdc5f651982cc4d00). This documentation update does not change application behavior or deploy a release.

## Start here

- [Documentation index](docs/README.md)
- [Canonical project state](docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md): source, evidence, boundaries and working rules
- [Product roadmap](docs/product/TACHOCOMMAND-ROADMAP.md): proposed work and acceptance gates
- [2026-10-01 source review](docs/audit/2026-10-01-source-review.md): reproduced findings, still open
- [Current release policy](docs/releases/2026-09-30-open-beta.md)

## Current capabilities

| Area | Implemented behavior |
| --- | --- |
| LIVE | Activity, continuous driving and cumulative break; optional daily/weekly driving values remain unknown when unavailable. Confirmed samples and saved values are distinguished. |
| Card | Full Driver Card Slot 1 BLE download, actual packet/byte progress, cancellation, wake-lock request and bounded waits. |
| History | Up to 56 retained UTC calendar days, projected to the phone's time zone, newest first. Day details include a timeline, durations and available insertion/removal markers. |
| Periods | LIVE daily/weekly values and a card-derived previous-calendar-week plus current-week total. Missing dates keep the latter unknown; within-day coverage remains an open correction. |
| Break screening | Scoped standard 4 h 30 min driving-break check: 45-minute break or ordered 15 + 30-minute split. Not a full infringement engine. |
| Local data | Explicit saved-card selection, deletion and CSV overview. Failed reads preserve the previous good snapshot; failed persistence is clearly labelled. |
| Product | Seven-language landing/app surfaces, installation help and pairing guidance; guide parity and translations need device/native review. |
| Support | Random attempt codes, restricted technical telemetry, queued delivery and authenticated admin overview. |
| PWA | Offline shell, explicit updates and exclusion of API/admin responses from caching. Shell availability does not prove every workflow works offline. |

Interactive timeline zoom and segment selection are **planned**. Detailed speed history, LIVE use while driving, payments, signed DDD export and full legal analysis are **not current capabilities**. LIVE closes before card download; automatic LIVE continuation afterward is not implemented.

## Compatibility and proof

The strongest checked-in physical proof covers **Continental VDO DTCO 4.1a / GEN2 V2, Android Chrome, Driver Card Slot 1**. See the [App V2 field proof](docs/field-evidence/2026-09-19-app-v2-card-field-proof.md).

The owner has also reported successful DTCO 4.1 reads; current landing copy mentions 4.1 / 4.1a. An individual successful run is not certification of every firmware, phone or card. Other models, Stoneridge and iPhone/Safari remain unconfirmed for this path. New claims need recorded model/firmware/browser/build evidence.

One complete sample contained **269 submessages, 67,295 bytes and 61 TLV objects**. These are sample values, not mandatory counts for every card. Transfer completion, parser acceptance, independently checked accuracy and cryptographic authenticity are separate checks.

## Golden 0.32c is locked

Immutable reference: [original field artifact and evidence](docs/field-evidence/2026-09-16/README.md).

`docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html`

SHA-256: `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`

Do not edit, reformat or replace that artifact. Preserve proven protocol commands and credit/ACK behavior. Protocol research belongs in a separate isolated candidate and must never silently replace the golden path. Current operational wrapper bounds differ from historical artifact timing; neither is changed by this update.

## Honest data and privacy

- Connect, configure and read only while safely stationary. LIVE has a stationary guard; card reading has a preflight. Continuous app-side speed monitoring during the separate download is not established.
- Unknown is not zero, rest, compatibility confirmation or a clean legal verdict.
- Card identity/history stays local in the browser profile. Shared-phone users must explicitly select/delete saved data; there is no account isolation.
- Technical telemetry excludes identity, card number, vehicle identity, location, device name, raw bytes and measured tachograph values. Product analytics uses random visit IDs and restricted events; this is not a blanket anonymity claim about hosting logs.
- Technical-event retention is 60 days; product-event retention is 90 days. Scheduled cleanup exists; actual execution must be checked separately.
- CSV is a user overview, **not an official signed DDD file**. DDD signature/certificate validation is not implemented.
- Operator identity, privacy/legal review and commercial/payment requirements remain release work, not completed compliance claims.

## Development and verification

Node.js **22.13 or newer**; CI uses Node 22. Dependencies are locked in `package-lock.json`.

```bash
npm ci
npm run dev
```

```bash
npm run typecheck
npm run lint
npm test
npm run validate:artifact
```

`npm test` builds/validates the artifact and runs the Node suite. The 2026-10-01 review passed 332 tests, typecheck and build; lint had zero errors and two existing warnings. Local review used Node 24.19.0; GitHub CI also passed for the reviewed source on Node 22. These checks do not replace hardware/mobile testing.

## Source map

| Path | Responsibility |
| --- | --- |
| `app/app/page.tsx`, `app/app-v2/app-v2-client.tsx` | Active app and LIVE/card lifecycle |
| `app/app/field-proven-premium-ui.tsx` | Driver screens and day details |
| `lib/app-v2-golden-card-*.js` | Golden-compatible protocol/browser transport |
| `lib/app-v2-canonical-card-parser.js` | TLV and activity parsing |
| `lib/app-v2-parser-card-adapter.js`, `lib/app-v2-phone-timeline.js` | UTC normalization and local display |
| `lib/card-utc-review.js`, `lib/card-break-analysis.js` | UTC break screening and CSV |
| `lib/last-good-card-snapshot.js` | Snapshot validation/persistence |
| `app/api/`, `app/admin/`, `db/`, `drizzle/` | Telemetry, analytics, admin and schema |
| `public/sw.js`, `app/service-worker-register.tsx` | Offline shell and updates |
| `worker/index.ts`, `wrangler.jsonc` | Independent Cloudflare Worker |

Legacy/manual and field-test surfaces remain; they are not the authoritative `/app` product. Classify before removal.

## Delivery

`main` is the integration target. Production uses independent Cloudflare Worker `tachocommand`, binding `DB` to `tachocommand-prod`. Retained Sites files are history/build support, not a direction to deploy there.

Use the existing **Cloudflare production deploy** workflow with the full reviewed `main` SHA. It builds, tests, checks the fixed target, applies versioned migrations and deploys. A merge or successful workflow does not replace live origin/build/API checks and required hardware verification. Documentation-only changes do not require deployment.
