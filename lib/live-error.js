// Match only known operational messages. Never send the free-form error text.
export function classifyLiveError(errorText, transportReady = false) {
  const message = typeof errorText === "string" ? errorText.toLowerCase() : "";
  if (/brzina tahografa nije potvrđena/.test(message)) return "stationary_response_unconfirmed";
  if (/vozilo nije na 0 km/.test(message)) return "stationary_response_nonzero";
  if (/testerpresent nije/.test(message)) return "tester_present_timeout";
  if (/live_connect_timeout/.test(message)) return "gatt_connect_failed";
  if (/bluetooth nije dostupan|web bluetooth nije dostupan/.test(message)) return "bluetooth_unavailable";
  if (/user cancelled the requestdevice|user canceled the requestdevice|izbor uređaja je otkazan|device selection was cancelled/.test(message)) return "chooser_cancelled";
  if (/servis nije pronađen|service not found|no services matching/.test(message)) return "service_missing";
  if (/karakteristike nisu pronađene|characteristic not found|no characteristics matching/.test(message)) return "characteristic_missing";
  if (/credit timeout|credits timeout/.test(message)) return "credits_timeout";
  if (/veza je prekinuta|device disconnected/.test(message)) return "disconnected";
  if (!transportReady && /gatt.*(?:failed|nije uspelo)/.test(message)) return "gatt_connect_failed";
  return "unknown";
}

