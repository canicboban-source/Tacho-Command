/**
 * V19: Web Bluetooth's chooser must be called directly from the user's click.
 * Connect the selected GATT device BEFORE displaying the operator readiness
 * checkpoint, otherwise the tachograph never sees a Bluetooth connection.
 *
 * After confirmation, pass the already-connected, original GATT server into
 * the unchanged GOLDEN card reader. Do not reconnect, trigger a fresh chooser,
 * issue card commands, or retry a partially completed card transfer here.
 */
export function createDeferredCardDeviceChooser({ bluetooth, onDeviceSelected } = {}) {
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Chrome Bluetooth nije dostupan.");
  }
  if (typeof onDeviceSelected !== "function") {
    throw new Error("Potvrda spremnosti kartice nije dostupna.");
  }

  return Object.freeze({
    requestDevice: async (options) => {
      // No asynchronous work before requestDevice: preserve user activation.
      const device = await bluetooth.requestDevice(options);
      if (!device?.gatt || typeof device.gatt.connect !== "function") {
        throw new Error("Tahograf nije izabran za očitavanje kartice.");
      }

      // The V18 bug was awaiting confirmation BEFORE this connection.
      const connectedServer = await device.gatt.connect();
      if (device.gatt.connected !== true || !connectedServer) {
        throw new Error("Bluetooth veza sa tahografom nije uspostavljena.");
      }

      try {
        await onDeviceSelected(device);
      } catch (error) {
        // A timed-out/aborted field checkpoint must not leave an orphan
        // GATT session open. Never start or silently retry the card read.
        try { device.gatt.disconnect?.(); } catch {}
        throw error;
      }

      if (device.gatt.connected !== true) {
        throw new Error("Bluetooth veza je prekinuta pre potvrde spremnosti kartice.");
      }

      // The GOLDEN reader calls device.gatt.connect() as before. Return the
      // SAME native server and never open a second connection at this point.
      return Object.freeze({
        name: device.name,
        id: device.id,
        gatt: Object.freeze({
          get connected() { return device.gatt.connected; },
          async connect() {
            if (device.gatt.connected !== true) {
              throw new Error("Bluetooth veza je prekinuta pre početka čitanja kartice.");
            }
            return connectedServer;
          },
          disconnect() { device.gatt.disconnect?.(); },
        }),
      });
    },
  });
}
