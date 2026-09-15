# 0.32b Gen2v2 Overview probe gate — 2026-09-15

## Purpose

Prove the Generation 2 version 2 Download BLE/DDP path one step beyond `DownloadInterfaceVersion` without requesting driver-card data.

## Source-grounded protocol boundary

The governing Appendix 7 download protocol defines:

- `TransferData` request SID `36`.
- `TRTP/TREP 00` as Download Interface Version for Generation 2 version 2, expected `02 02`.
- `TRTP/TREP 31` as Overview for Generation 2 version 2.
- multipart `SID 76` responses with a two-byte sub-message counter when the application message exceeds one DDP message.
- `SID 83` acknowledgement containing the received SID (`76`) and the next two-byte sub-message counter.
- `RequestTransferExit` (`37`) and `StopCommunication` (`82`) for controlled teardown.

Primary regulatory source: Commission Implementing Regulation (EU) 2021/1228 amending Annex IC Appendix 7 of Implementing Regulation (EU) 2016/799; current consolidated Annex IC remains the deployment truth to re-check before any later card-download candidate.

## Safety boundary

0.32b may send only:

1. StartCommunication.
2. StartDiagnosticSession.
3. RequestUpload.
4. DownloadInterfaceVersion TREP 00.
5. Gen2v2 Overview TREP 31.
6. Required SID 83 sub-message ACKs for the Overview transfer.
7. RequestTransferExit.
8. StopCommunication.

It must not send Card Download TREP 06.

## Data minimisation

Overview may contain certificates and vehicle-identifying data. The probe therefore does not persist, render, copy, or export the Overview payload. It keeps only transfer metadata required for protocol control: expected counter, number of sub-messages, and aggregate payload byte count.

## BLE flow-control correction

Every client FIFO write consumes one server-granted transmit credit. Credits received later are additive. The probe waits for a credit before each FIFO write and fails closed on credit timeout or peer disconnect (`FF`). Each received FIFO packet is replenished with one client credit.

## Gate to 0.32c

A 0.32c Card Download candidate must not be created from field assumptions. It requires a successful physical 0.32b result with:

- Download service + FIFO/Credits available,
- credit-safe communication,
- positive session setup,
- `TREP 00 -> 02 02`,
- completed `TREP 31` transfer with valid counter progression and ACKs,
- confirmed `37 -> 77` and `82 -> C2` teardown.

Only then may a separate bounded TREP 06 candidate be considered.
