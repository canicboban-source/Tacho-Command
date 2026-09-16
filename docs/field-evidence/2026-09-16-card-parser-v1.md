# TachoCommand Card Parser v1

Date: 2026-09-16

## Purpose

Create the first offline product layer after the successful Smart Tacho V2 driver-card download field proof.

This parser is intentionally independent from the Bluetooth/DDP download engine. It consumes already-downloaded card bytes and performs deterministic structural decoding only.

## Scope

`lib/tacho-card-parser.js` implements:

- strict top-level DDD TLV framing (`3-byte tag + 2-byte length + value`);
- exact extraction of `EF Driver_Activity_Data`:
  - Generation 1 download block `050400`;
  - Generation 2 download block `050402`;
- `CardDriverActivity` circular-buffer traversal;
- wrapped daily records that cross the end of the activity buffer;
- `activityPreviousRecordLength` chain validation;
- `CardActivityDailyRecord` parsing;
- `ActivityChangeInfo` decoding;
- normalized activity segments;
- minute totals for REST / AVAILABILITY / WORK / DRIVING / UNKNOWN;
- inclusive calendar windows, including the 56-calendar-day view.

## Normative interpretation boundary

The parser follows the Annex IC data-type definitions in Commission Implementing Regulation (EU) 2016/799:

- `CardDriverActivity`;
- `CardActivityDailyRecord`;
- `ActivityChangeInfo`.

`ActivityChangeInfo` is treated as the 16-bit `scpaattttttttttt` word:

- `s`: driver/co-driver slot;
- `c`: single/crew while the card is inserted, or following-activity known/unknown while not inserted;
- `p`: inserted/not inserted;
- `aa`: break/rest, availability, work, driving;
- `t`: minute since 00:00.

The parser deliberately returns `activity: null` when the card is not inserted and the following activity is unknown. It does not invent an activity for an undefined interval.

## Safety and privacy

The real field `.ddd` fixture is **not committed to the repository**.

Regression tests use synthetic byte fixtures only. No driver name, card number, licence number, vehicle registration, GNSS position, certificate, signature, or raw personal card content is stored in source control.

## Verification

Synthetic regression tests cover:

1. strict DDD TLV boundaries;
2. `ActivityChangeInfo` bit decoding;
3. circular record wrapping;
4. `previousRecordLength` chaining;
5. segment/totals handling with unknown card-out periods;
6. an inclusive 56-day calendar window;
7. exact Gen2 `050402` extraction.

Private field validation against the successful 2026-09-16 download independently reproduced the previously established structural results:

- 61 top-level TLV objects;
- 217 daily activity records;
- oldest record: 2026-02-12;
- newest record: 2026-09-16;
- 56-day inclusive window start: 2026-07-23.

These private-field values are verification evidence only; the personal fixture remains outside Git.

## Explicitly not yet implemented

- cryptographic signature validation;
- card-certificate trust-chain validation;
- semantic decoding of every Gen2/Gen2v2 EF;
- infringement/legal-compliance conclusions;
- jurisdiction-specific working-time conclusions;
- UI rendering.

The next product layer should consume this parser output to build the 56-day driver timeline without re-reading or re-interpreting raw card bytes in UI code.
