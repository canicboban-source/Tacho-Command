# 56-day feasibility audit — 2026-09-15

## Result

The 56-day history path is technically separate from the live RDBI cockpit.

The current 0.31d field candidate reads live values through the Diagnostics BLE service. Driver-card history belongs to the standardized Download path and is transferred as a card download (TRTP/TREP 06) through the Download BLE serial-port service.

## Verified basis

Public Smart Tachograph V2 transport specifications define two separate BLE serial-port services:

- Download service: `eef90782-55dd-4388-b80b-695aba7a69b5`
- Download FIFO: `29d3a479-1592-47df-80a4-afa742d369bb`
- Download Credits: `db9c4128-bff3-41fe-a306-fb6f9a8aeb2d`
- Diagnostics service: `fa213def-aef4-475c-bcea-0a8d69073efc`

The Download service uses the same BLE credit-based serial-port transport concept as Diagnostics. The application-layer download protocol is defined separately in Annex IC Appendix 7.

The repository already contains the bounded DDP message sequence in `lib/tacho-download.js`, including Start Communication, Start Diagnostic Session, Request Upload, card download request for slot 1, Transfer Exit and Stop Communication.

For Smart Tachograph V2, the download interface also exposes a DownloadInterfaceVersion transfer request (`36 00`). Generation 2 version 2 identifies itself as generation `02`, version `02`.

## Important safety/product boundary

A complete driver-card download is not strictly read-only from the card's point of view. The regulatory download procedure can update the card's `LastCardDownload` field after a driver-card download. Therefore the first history feasibility candidate must not silently send Card Download TREP 06.

`0.32a-download-path-probe` is intentionally limited to:

1. Connect to the standardized Download BLE service.
2. Establish BLE FIFO/Credits flow control.
3. Start the bounded DDP communication session.
4. Request upload.
5. Read DownloadInterfaceVersion (TREP 00).
6. Exit transfer and stop communication.

It does not request driver-card data, does not read Driver_Activity_Data, does not create a `.DDD` file and does not persist raw bytes.

## Gate for the next candidate

Only after 0.32a proves the Download BLE/DDP path on the physical DTCO 4.1a should a separate 0.32b candidate be considered for Card Download TREP 06. That candidate must explicitly warn that a standards-compliant card download may update `LastCardDownload`, must be bounded, must provide clean teardown, and must not claim a valid historical file until the required data/signature structure is received and verified.
