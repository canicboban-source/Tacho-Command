/**
 * Preserve the browser chooser's synchronous user activation, then hold
 * the selected device before any GATT connect / DDP command. The field
 * operator confirms that the tachograph completed card recognition.
 * The verified golden reader remains byte-for-byte unchanged.
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
      // Important: do not await UI state, timer or network before the chooser:
      // Web Bluetooth requestDevice requires the original user gesture.
      const device = await bluetooth.requestDevice(options);
      if (!device?.gatt) throw new Error("Tahograf nije izabran za očitavanje kartice.");
      await onDeviceSelected(device);
      return device;
    },
  });
}
