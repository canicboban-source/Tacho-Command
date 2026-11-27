
export const liveGuidance = {
  "en": {
    "unsupported": "Open this page in Chrome on an Android phone to use Bluetooth.",
    "choose": "Choose your tachograph and confirm pairing on both screens.",
    "speed": "No speed reading was confirmed. Park safely and reconnect.",
    "moving": "The tachograph reported movement. Park before reading.",
    "service": "The device did not provide the required service. Check the tachograph and reconnect.",
    "reconnect": "The connection was interrupted. Check pairing and reconnect."
  },
  "sr": {
    "unsupported": "Otvori ovu stranicu u Chrome-u na Android telefonu za Bluetooth povezivanje.",
    "choose": "Izaberi tahograf i potvrdi uparivanje na oba ekrana.",
    "speed": "Brzina nije potvrđena. Parkiraj i ponovo poveži tahograf.",
    "moving": "Tahograf je prijavio kretanje. Parkiraj pre očitavanja.",
    "service": "Uređaj nema potreban servis. Proveri izbor tahografa i poveži ponovo.",
    "reconnect": "Veza je prekinuta. Proveri uparivanje i poveži ponovo."
  },
  "de": {
    "unsupported": "Öffne diese Seite in Chrome auf einem Android-Telefon, um Bluetooth zu nutzen.",
    "choose": "Wähle den Tachografen und bestätige die Kopplung auf beiden Geräten.",
    "speed": "Geschwindigkeit unbestätigt. Sicher parken und erneut verbinden.",
    "moving": "Der Tachograf meldet Bewegung. Vor dem Auslesen parken.",
    "service": "Der benötigte Dienst fehlt. Tachograf prüfen und erneut verbinden.",
    "reconnect": "Verbindung unterbrochen. Kopplung prüfen und erneut verbinden."
  },
  "ro": {
    "unsupported": "Deschide pagina în Chrome pe un telefon Android pentru Bluetooth.",
    "choose": "Alege tahograful și confirmă asocierea pe ambele dispozitive.",
    "speed": "Viteza nu a fost confirmată. Parchează și reconectează-te.",
    "moving": "Tahograful indică mișcare. Parchează înainte de citire.",
    "service": "Serviciul necesar lipsește. Verifică tahograful și reconectează-te.",
    "reconnect": "Conexiune întreruptă. Verifică asocierea și reconectează-te."
  },
  "hu": {
    "unsupported": "A Bluetooth használatához nyisd meg az oldalt Androidon a Chrome-ban.",
    "choose": "Válaszd ki a menetírót, és erősítsd meg a párosítást mindkét eszközön.",
    "speed": "A sebesség nem igazolt. Parkolj le, majd csatlakozz újra.",
    "moving": "A menetíró mozgást jelez. Olvasás előtt parkolj le.",
    "service": "A szükséges szolgáltatás hiányzik. Ellenőrizd a menetírót, és csatlakozz újra.",
    "reconnect": "A kapcsolat megszakadt. Ellenőrizd a párosítást, és csatlakozz újra."
  },
  "ru": {
    "unsupported": "Для Bluetooth откройте страницу в Chrome на телефоне Android.",
    "choose": "Выберите тахограф и подтвердите сопряжение на обоих устройствах.",
    "speed": "Скорость не подтверждена. Припаркуйтесь и подключитесь снова.",
    "moving": "Тахограф сообщает о движении. Перед чтением припаркуйтесь.",
    "service": "Нужная служба отсутствует. Проверьте выбор тахографа и подключитесь снова.",
    "reconnect": "Связь прервана. Проверьте сопряжение и подключитесь снова."
  },
  "bg": {
    "unsupported": "За Bluetooth отворете страницата в Chrome на телефон с Android.",
    "choose": "Изберете тахографа и потвърдете сдвояването на двете устройства.",
    "speed": "Скоростта не е потвърдена. Паркирайте и се свържете отново.",
    "moving": "Тахографът отчита движение. Паркирайте преди четене.",
    "service": "Липсва необходимата услуга. Проверете тахографа и се свържете отново.",
    "reconnect": "Връзката е прекъсната. Проверете сдвояването и се свържете отново."
  }
};

export function guidanceFor(code, locale) {
  const copy = liveGuidance[locale];
  switch (code) {
    case "bluetooth_unavailable": return copy.unsupported;
    case "chooser_cancelled": return copy.choose;
    case "stationary_response_unconfirmed": return copy.speed;
    case "stationary_response_nonzero": return copy.moving;
    case "service_missing": return copy.service;
    case "characteristic_missing": return copy.service;
    case "gatt_connect_failed": return copy.choose;
    case "disconnected": return copy.reconnect;
    case "credits_timeout": return copy.reconnect;
    case "tester_present_timeout": return copy.reconnect;
    default: return null;
  }
}
