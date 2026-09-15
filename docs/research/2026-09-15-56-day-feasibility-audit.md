# TachoCommand 56-day history feasibility audit

Date: 2026-09-15

Status: FEASIBLE PATH IDENTIFIED; FIELD PROOF NOT YET COMPLETE.

## Executive conclusion

The 56-day history requirement is not a continuation of the live RDBI path proven by 0.31d. The live Diagnostics BLE path gives current state/time DIDs. Historical driver-card activity belongs to the driver-card data/download path.

The repository already contains a separate download-protocol foundation in `lib/tacho-download.js`, including a bounded DDP state machine and a specific driver-card-slot-1 transfer request. This is the strongest existing technical lead for a 56-day proof candidate.

The next field experiment should therefore be isolated from 0.31d. Do not add more DIDs to the proven live path and do not reintroduce the old Remote HMI/F211 flow.

## What is already proven

0.31d has live field evidence on VDO DTCO 4.1a:

- Diagnostics BLE transport works.
- TesterPresent works.
- After a 1-second settling delay, F923/F925/F903/F99A/F99B all return positive responses.
- Four consecutive complete runs produced 20/20 positive RDBI reads with no timeout or NRC.
- The operator reported that the returned values matched the physical tachograph display.

This proves the live cockpit path, not historical card-file extraction.

## Existing repository evidence for a separate download path

`lib/tacho-download.js` defines a DDP-style sequence with framing/checksum and explicit phases:

1. Start communication (`0x81`)
2. Start diagnostic session (`0x10 0x81` inside the DDP frame)
3. Request upload (`0x35`)
4. Request overview (`0x36 0x01`)
5. Request driver card slot 1 (`0x36 0x06 0x01`)
6. Request transfer exit (`0x37`)
7. Stop communication (`0x82`)

The helper also contains teardown logic and tests for these messages. This means the repository already has protocol work aimed at a card-download operation, although it is not field-proven and must not be assumed correct merely because unit tests pass.

## Important distinction: live ITS/RDBI vs history

The current live candidate reads:

- F903 working state
- F923 continuous driving time
- F925 cumulative break time
- F99A current daily driving time
- F99B current weekly driving time

These are live/current values. They are not a 56-day event history interface.

The 56-day product feature should be based on genuine driver-card records or an authorized download representation. It must not reconstruct history from browser-local samples and must not synthesize `.DDD` files.

## Regulatory/product basis

EU Smart Tachograph rules require modern driver cards to retain an extended activity history and define downloadable card/vehicle data structures and transfer mechanisms. The product landing page already correctly treats 56-day history as a validation target rather than a proven feature.

For TachoCommand, the safe product interpretation is:

- the card/history path remains experimental until actual data is obtained from physical hardware;
- official card/download data remains authoritative;
- no compatibility claim should be made for untested tachograph models;
- no payment unlock should depend on a fake or locally reconstructed history implementation.

## Main unresolved questions

Before calling history solved, the field probe must answer:

1. Does DTCO 4.1a expose the expected Download BLE service and FIFO/Credits characteristics in this phone/browser path?
2. Does the unit accept the DDP start-communication/session sequence under the current driver-card/consent state?
3. Does `RequestUpload` receive a positive response?
4. Does `TransferData` for overview and driver-card slot 1 produce actual downloadable card data?
5. Are responses fragmented differently from the current ITS/UDS collector, requiring a dedicated DDP transport collector?
6. Is an on-device/local approval prompt required for the card-download path?
7. Is a company/workshop/control-card authentication step required for this specific operation, or is own-card download available with the driver card present?
8. Can the resulting bytes be parsed into genuine card activity daily records spanning the desired history window?
9. Can the data be handled without collecting unnecessary identifiers or retaining raw downloads longer than needed?

These questions must be answered by evidence. Do not infer success from protocol documentation alone.

## Recommended next candidate: 0.32a-history-probe

Create a separate, temporary, read-only history probe with the following boundary:

- separate route/client from the proven 0.31d live candidate;
- use only the Download BLE service, not the Diagnostics RDBI path;
- one bounded attempt per user action; no background loop;
- log each protocol phase and its exact classification: POSITIVE, NRC/negative, TIMEOUT, TRANSPORT ERROR;
- stop after the first unsupported/negative phase and run best-effort teardown;
- initially do not parse or display personal card contents;
- initially record only privacy-safe metadata: phase, response SID/type, transfer length/chunk counts, and whether a valid downloadable payload was obtained;
- do not persist raw card bytes in browser localStorage;
- do not upload card bytes to a server;
- do not generate `.DDD` files;
- do not invoke Remote HMI/F211 automatically as fallback.

### First field milestone

The first milestone is not 'show 56 days'. It is much smaller:

**Prove that a real driver-card download payload can be obtained through the DTCO 4.1a Download BLE path in a controlled stationary test.**

Only after this passes should parsing of activity structures begin.

### Second field milestone

After a genuine card payload is captured in memory and its structure validated locally:

- identify driver activity daily record structures;
- derive calendar/activity intervals from the signed/downloaded source;
- compare at least several recent days against the physical tachograph/card display or trusted download software;
- determine the actual retained date range on the tested card.

Only after that should the user-facing 'up to 56 days' UI be enabled.

## Go / no-go rule

GO to implementation of `0.32a-history-probe` because:

- live telemetry is now proven;
- the repository contains a distinct download protocol foundation;
- the history requirement maps naturally to the driver-card download path rather than more live DIDs.

NO-GO for claiming 56-day support today because:

- no physical card-download payload has yet been proven through this Web Bluetooth path;
- authentication/approval requirements for the tested DTCO configuration remain field questions;
- no genuine historical activity structure has yet been parsed and compared against an authoritative source.

## Recommended order of work

1. Preserve 0.31d unchanged.
2. Add targeted unit tests around the DDP collector/state transitions needed by the history probe.
3. Build `0.32a-history-probe` as a separate experimental route.
4. Deploy to temporary HTTPS staging.
5. Perform one stationary field attempt and capture the privacy-safe phase log.
6. Only if transfer succeeds, implement activity-file parsing as a separate step.

This keeps the successful live cockpit path isolated and turns the remaining history problem into a narrow, measurable experiment.
