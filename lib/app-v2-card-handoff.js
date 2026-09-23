const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A LIVE Diagnostics flow-control close can cause the VU to drop its GATT link
 * briefly. Do not start the proven Download protocol until the selected
 * BluetoothDevice is connected again. Reconnect only this already selected
 * device: never repeat a card transfer and never bypass the speed guard.
 */
export async function prepareAppV2CardHandoff({
  device,
  settleMs = 1200,
  reconnectSettleMs = 650,
  sleep = delay,
} = {}) {
  if (!device?.gatt || typeof device.gatt.connect !== "function") {
    throw new Error("Izabrani tahograf nema dostupan GATT interfejs.");
  }
  await sleep(settleMs);
  let recovered = false;
  if (device.gatt.connected !== true) {
    try {
      await device.gatt.connect();
    } catch (error) {
      throw new Error(
        "Tahograf se nije ponovo povezao posle LIVE sesije: "
        + (error instanceof Error ? error.message : String(error)),
      );
    }
    recovered = true;
    await sleep(reconnectSettleMs);
  }
  if (device.gatt.connected !== true) {
    throw new Error("Tahograf nije povezan za početak čitanja kartice.");
  }
  return Object.freeze({ connected: true, recovered });
}
