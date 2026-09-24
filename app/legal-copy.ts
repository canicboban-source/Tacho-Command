export type LegalLocale = "sr" | "en" | "de";
export type LegalDocument = "privacy" | "terms" | "impressum";
type Section = { heading: string; paragraphs: string[] };
type Page = { title: string; description: string; updated: string; sections: Section[] };

export const legalLocales = ["sr", "en", "de"] as const;
export const legalDocuments = ["privacy", "terms", "impressum"] as const;
export const isLegalLocale = (value: string): value is LegalLocale => legalLocales.includes(value as LegalLocale);
export const isLegalDocument = (value: string): value is LegalDocument => legalDocuments.includes(value as LegalDocument);

export const legalCopy: Record<LegalLocale, Record<LegalDocument, Page>> = {
  sr: {
    impressum: {
      title: "Impressum", description: "Podaci izdavača i kontakt za TachoCommand.", updated: "Ažurirano 24. septembra 2026.",
      sections: [
        { heading: "Odgovoran za sadržaj i kontakt", paragraphs: ["Canic Boban\nBeim Spitzerriegel 2\n2500 Baden\nAustrija", "E-pošta: info@tachocommand.com"] },
        { heading: "Status usluge", paragraphs: ["Projekat trenutno vodi fizičko lice. TachoCommand je u beta periodu; kupovina i naplata putem ovog sajta nisu dostupne.", "Podaci o registrovanoj delatnosti biće dopunjeni ako se status projekta promeni pre otvaranja prodaje."] },
      ],
    },
    terms: {
      title: "Uslovi beta korišćenja", description: "Uslovi korišćenja TachoCommand zatvorene beta verzije za profesionalne vozače.", updated: "Radna verzija • 18. avgust 2026.",
      sections: [
        { heading: "Pomoćni alat", paragraphs: ["TachoCommand je tokom bete pomoćni, eksperimentalni prikaz. Tahograf, kartica vozača, zvanični zapisi i važeći propisi ostaju merodavni."] },
        { heading: "Bezbedna upotreba", paragraphs: ["Bluetooth povezivanje, podešavanje i pregled telefona obavljaju se samo dok je vozilo bezbedno zaustavljeno. Aplikacija se ne koristi tokom vožnje."] },
        { heading: "Trodnevni demo", paragraphs: ["Demo traje 72 sata od prvog uspešnog pokretanja, ne zahteva platnu karticu i ne pretvara se automatski u naplatu."] },
        { heading: "Beta pristup", paragraphs: ["Funkcije se mogu menjati na osnovu terenskih rezultata. Kupovina još nije dostupna i nijedna cena na sajtu trenutno ne predstavlja aktivnu ponudu za zaključenje ugovora."] },
      ],
    },
    privacy: {
      title: "Privatnost", description: "Privatnost u TachoCommand beta verziji: kontakt, podaci na uređaju, analitika i tehnička telemetrija.", updated: "Ažurirano 24. septembra 2026.",
      sections: [
        { heading: "Ko je odgovoran i kako da nas kontaktirate", paragraphs: ["Canic Boban, Beim Spitzerriegel 2, 2500 Baden, Austrija. Za pitanja o podacima i zahteve za pristup ili brisanje pišite na info@tachocommand.com.", "TachoCommand trenutno vodi fizičko lice. Kupovina i naplata nisu aktivne."] },
        { heading: "Demo pristup", paragraphs: ["TachoCommand postavlja tehnički, HttpOnly kolačić da bi server potpisao početak trodnevnog demo perioda. Kolačić ne sadrži ime, e-mail, broj kartice vozača, registraciju ili lokaciju."] },
        { heading: "Minimalna product analytics", paragraphs: ["Radi razumevanja korišćenja proizvoda beležimo ograničene događaje kao što su otvaranje početne strane ili aplikacije, pokretanje demo pristupa, klik na vodič i izbor jezika. Analitika čuva nasumični identifikator sesije, vrstu događaja, deo proizvoda, jezik, grubu kategoriju izvora posete i vreme prijema na serveru. Identifikator sesije može predstavljati podatak o ličnosti; ne predstavljamo ove događaje kao potpuno anonimne.", "U ovu product analytics evidenciju ne upisujemo ime vozača, broj kartice, registraciju, GPS lokaciju, naziv Bluetooth uređaja, raw tahografske podatke, pun URL, query parametre, IP adresu ili user-agent. Nasumični identifikator je vezan za browser sesiju, a analytics događaji se čuvaju najviše 90 dana."] },
        { heading: "Tehnička telemetrija", paragraphs: ["Tokom očitavanja aplikacija može automatski poslati ograničene tehničke događaje potrebne za dijagnostiku: fazu, ishod, podržani DID, trajanje, NRC, porodicu uređaja, tehnički error code i support code pokušaja. Ova telemetrija ne sadrži identitet vozača, broj kartice, registraciju, lokaciju, pune Bluetooth nazive, raw byte sadržaj niti stvarne vrednosti sa tahografa. Tehnička telemetrija se čuva najviše 60 dana."] },
        { heading: "Podaci kartice i aplikacije", paragraphs: ["Očitani podaci kartice namenjeni prikazu u TachoCommand-u obrađuju se za funkcije aplikacije. Lični raw .ddd field fixture ne objavljujemo u javnom repozitorijumu. Lokalni snapshot poslednjeg uspešnog očitavanja, kada je funkcija dostupna, čuva se u pregledaču na uređaju."] },
        { heading: "Bluetooth", paragraphs: ["Pregledač prikazuje svoj izbor uređaja. TachoCommand ne uspostavlja Bluetooth vezu bez jasne radnje korisnika."] },
        { heading: "Hosting i svrha obrade", paragraphs: ["Sajt i ograničena tehnička evidencija rade preko Cloudflare infrastrukture. Kolačić za demo služi da sačuva početak probnog pristupa; analitika služi merenju upotrebe proizvoda; tehnička telemetrija služi otkrivanju i rešavanju grešaka. Jezički izbor se čuva u pregledaču. Podaci sa kartice prikazuju se na telefonu i lokalni prikaz može ostati sačuvan u pregledaču."] },
        { heading: "Pravni osnovi", paragraphs: ["Demo pristup i prikaz podataka koje korisnik sam očita potrebni su za pružanje probne usluge na njegov zahtev (član 6 stav 1 tačka b GDPR). Ograničenu analitiku upotrebe i tehničku telemetriju obrađujemo radi opravdanog interesa da proverimo rad beta verzije i otklonimo greške (član 6 stav 1 tačka f GDPR); podatke ograničavamo na gore navedena tehnička polja. Ako se protivite ovoj obradi, pišite na navedenu adresu.", "Cloudflare pruža hosting sajta i serverskog dela aplikacije. Podaci u lokalnom prikazu kartice ostaju u pregledaču dok ih korisnik ne obriše; za evidenciju analitike i telemetrije važe gore navedeni rokovi."] },
        { heading: "Vaša prava", paragraphs: ["Možete zatražiti informacije o obradi, pristup, ispravku, brisanje ili ograničenje obrade, uložiti prigovor i zatražiti prenosivost tamo gde je primenljiva, putem navedene e-pošte. Imate pravo da podnesete pritužbu nadležnom organu za zaštitu podataka. Brisanjem podataka ovog sajta u pregledaču uklanjate lokalno sačuvani prikaz kartice i izbor jezika.", "Demo pristup je dobrovoljan. Bez neophodnog tehničkog kolačića server ne može da potvrdi trajanje demo perioda. Na osnovu evidencije analitike i telemetrije ne donosimo automatske odluke o korisnicima."] },
      ],
    },
  },
  en: {
    impressum: {
      title: "Legal notice", description: "Publisher and contact details for TachoCommand.", updated: "Updated 24 September 2026.",
      sections: [
        { heading: "Responsible for the content and contact", paragraphs: ["Canic Boban\nBeim Spitzerriegel 2\n2500 Baden\nAustria", "Email: info@tachocommand.com"] },
        { heading: "Service status", paragraphs: ["The project is currently run by an individual. TachoCommand is in beta; purchases and payments through this website are not available.", "Information about a registered business will be added if the project's status changes before sales begin."] },
      ],
    },
    terms: {
      title: "Beta terms of use", description: "Terms of use for the TachoCommand closed beta for professional drivers.", updated: "Draft • 18 August 2026.",
      sections: [
        { heading: "Supporting tool", paragraphs: ["During the beta, TachoCommand provides an auxiliary, experimental display. The tachograph, driver card, official records and applicable regulations remain authoritative."] },
        { heading: "Safe use", paragraphs: ["Connect via Bluetooth, adjust settings and view the phone only when the vehicle is safely stopped. Do not use the app while driving."] },
        { heading: "Three-day demo", paragraphs: ["The demo lasts 72 hours from its first successful activation, requires no payment card and does not automatically turn into a paid subscription."] },
        { heading: "Beta access", paragraphs: ["Features may change based on field results. Purchases are not yet available, and no price displayed on the website currently constitutes an active offer to enter into a contract."] },
      ],
    },
    privacy: {
      title: "Privacy", description: "Privacy in the TachoCommand beta: contact, on-device data, analytics and technical telemetry.", updated: "Updated 24 September 2026.",
      sections: [
        { heading: "Who is responsible and how to contact us", paragraphs: ["Canic Boban, Beim Spitzerriegel 2, 2500 Baden, Austria. For questions about data or requests for access or deletion, write to info@tachocommand.com.", "TachoCommand is currently run by an individual. Purchases and payments are not active."] },
        { heading: "Demo access", paragraphs: ["TachoCommand sets a technical HttpOnly cookie so that the server can sign the start of the three-day demo period. The cookie contains no name, email address, driver card number, vehicle registration or location."] },
        { heading: "Minimal product analytics", paragraphs: ["To understand product use, we record limited events such as opening the home page or app, starting demo access, clicking the guide and selecting a language. Analytics stores a random session identifier, event type, part of the product, language, broad category of traffic source and time received by the server. A session identifier may be personal data; we do not describe these events as fully anonymous.", "We do not put the driver's name, card number, vehicle registration, GPS location, Bluetooth device name, raw tachograph data, full URL, query parameters, IP address or user-agent into this product analytics record. The random identifier is tied to the browser session, and analytics events are kept for no more than 90 days."] },
        { heading: "Technical telemetry", paragraphs: ["During a card read, the app may automatically send limited technical events needed for diagnosis: phase, outcome, supported DID, duration, NRC, device family, technical error code and attempt support code. This telemetry contains no driver identity, card number, vehicle registration, location, full Bluetooth names, raw byte content or actual tachograph values. Technical telemetry is kept for no more than 60 days."] },
        { heading: "Card and app data", paragraphs: ["Card data read for display in TachoCommand is processed for the app's functions. We do not publish a personal raw .ddd field fixture in the public repository. A local snapshot of the last successful read, when the feature is available, is stored in the browser on the device."] },
        { heading: "Bluetooth", paragraphs: ["The browser presents its own device picker. TachoCommand does not establish a Bluetooth connection without an explicit user action."] },
        { heading: "Hosting and purposes of processing", paragraphs: ["The website and limited technical records run on Cloudflare infrastructure. The demo cookie preserves the start of trial access; analytics measures product use; technical telemetry helps detect and fix errors. Language selection is stored in the browser. Card data is displayed on the phone, and the local display may remain saved in the browser."] },
        { heading: "Legal bases", paragraphs: ["Demo access and the display of data the user reads themselves are necessary to provide the trial service at their request (Article 6(1)(b) GDPR). We process limited usage analytics and technical telemetry for our legitimate interest in checking how the beta works and fixing errors (Article 6(1)(f) GDPR); we limit the data to the technical fields listed above. If you object to this processing, write to the address above.", "Cloudflare hosts the website and server-side part of the app. Data in the local card display stays in the browser until the user deletes it; the retention periods stated above apply to analytics and telemetry records."] },
        { heading: "Your rights", paragraphs: ["You can request information about processing, access, rectification, erasure or restriction of processing, object to processing and request data portability where applicable, by using the email address above. You have the right to complain to the competent data protection authority. Deleting this website's data in your browser removes the locally saved card display and language selection.", "Demo access is voluntary. Without the necessary technical cookie, the server cannot confirm the length of the demo period. We do not make automated decisions about users based on analytics or telemetry records."] },
      ],
    },
  },
  de: {
    impressum: {
      title: "Impressum", description: "Anbieterangaben und Kontakt für TachoCommand.", updated: "Aktualisiert am 24. September 2026.",
      sections: [
        { heading: "Verantwortlich für den Inhalt und Kontakt", paragraphs: ["Canic Boban\nBeim Spitzerriegel 2\n2500 Baden\nÖsterreich", "E-Mail: info@tachocommand.com"] },
        { heading: "Status des Angebots", paragraphs: ["Das Projekt wird derzeit von einer Privatperson betrieben. TachoCommand befindet sich in der Betaphase; Käufe und Zahlungen über diese Website sind nicht möglich.", "Angaben zu einer registrierten gewerblichen Tätigkeit werden ergänzt, falls sich der Projektstatus vor Verkaufsbeginn ändert."] },
      ],
    },
    terms: {
      title: "Beta-Nutzungsbedingungen", description: "Nutzungsbedingungen für die geschlossene TachoCommand-Beta für Berufskraftfahrer.", updated: "Entwurf • 18. August 2026.",
      sections: [
        { heading: "Hilfsmittel", paragraphs: ["TachoCommand bietet während der Betaphase eine ergänzende, experimentelle Anzeige. Maßgeblich bleiben Tachograph, Fahrerkarte, amtliche Aufzeichnungen und geltende Vorschriften."] },
        { heading: "Sichere Nutzung", paragraphs: ["Bluetooth-Verbindung, Einstellungen und die Nutzung des Smartphones erfolgen nur bei sicher abgestelltem Fahrzeug. Die App wird während der Fahrt nicht verwendet."] },
        { heading: "Dreitägige Demo", paragraphs: ["Die Demo dauert ab der ersten erfolgreichen Aktivierung 72 Stunden, erfordert keine Zahlungskarte und wird nicht automatisch kostenpflichtig."] },
        { heading: "Beta-Zugang", paragraphs: ["Funktionen können sich aufgrund von Praxistests ändern. Käufe sind noch nicht möglich; derzeit stellt kein auf der Website angezeigter Preis ein aktives Angebot zum Vertragsabschluss dar."] },
      ],
    },
    privacy: {
      title: "Datenschutz", description: "Datenschutz in der TachoCommand-Beta: Kontakt, Daten auf dem Gerät, Analyse und technische Telemetrie.", updated: "Aktualisiert am 24. September 2026.",
      sections: [
        { heading: "Verantwortliche Person und Kontakt", paragraphs: ["Canic Boban, Beim Spitzerriegel 2, 2500 Baden, Österreich. Bei Fragen zu Daten sowie Auskunfts- oder Löschanfragen schreiben Sie an info@tachocommand.com.", "TachoCommand wird derzeit von einer Privatperson betrieben. Käufe und Zahlungen sind nicht aktiviert."] },
        { heading: "Demo-Zugang", paragraphs: ["TachoCommand setzt ein technisches HttpOnly-Cookie, damit der Server den Beginn des dreitägigen Demozeitraums signieren kann. Das Cookie enthält weder Name, E-Mail-Adresse, Fahrerkartennummer, Kennzeichen noch Standort."] },
        { heading: "Minimale Produktanalyse", paragraphs: ["Um die Produktnutzung zu verstehen, erfassen wir begrenzte Ereignisse wie das Öffnen der Startseite oder App, den Start des Demo-Zugangs, einen Klick auf die Anleitung und die Sprachwahl. Die Analyse speichert eine zufällige Sitzungskennung, Ereignisart, Produktbereich, Sprache, grobe Kategorie der Zugriffsquelle und den Eingangszeitpunkt am Server. Eine Sitzungskennung kann ein personenbezogenes Datum sein; wir bezeichnen diese Ereignisse nicht als vollständig anonym.", "Wir speichern in dieser Produktanalyse weder Fahrername, Kartennummer, Kennzeichen, GPS-Standort, Bluetooth-Gerätename, rohe Tachographendaten, vollständige URL, Abfrageparameter, IP-Adresse noch User-Agent. Die zufällige Kennung ist an die Browsersitzung gebunden; Analyseereignisse werden höchstens 90 Tage gespeichert."] },
        { heading: "Technische Telemetrie", paragraphs: ["Während des Auslesens kann die App automatisch begrenzte technische Ereignisse zur Diagnose senden: Phase, Ergebnis, unterstützte DID, Dauer, NRC, Gerätefamilie, technischen Fehlercode und Support-Code des Versuchs. Diese Telemetrie enthält weder Fahreridentität, Kartennummer, Kennzeichen, Standort, vollständige Bluetooth-Namen, rohe Bytes noch tatsächliche Tachographenwerte. Technische Telemetrie wird höchstens 60 Tage gespeichert."] },
        { heading: "Karten- und App-Daten", paragraphs: ["Für die Anzeige in TachoCommand ausgelesene Kartendaten werden für App-Funktionen verarbeitet. Eine persönliche rohe .ddd-Testdatei veröffentlichen wir nicht im öffentlichen Repository. Eine lokale Momentaufnahme des letzten erfolgreichen Auslesens wird, sofern die Funktion verfügbar ist, im Browser des Geräts gespeichert."] },
        { heading: "Bluetooth", paragraphs: ["Der Browser zeigt eine eigene Geräteauswahl an. TachoCommand stellt ohne ausdrückliche Handlung des Nutzers keine Bluetooth-Verbindung her."] },
        { heading: "Hosting und Verarbeitungszwecke", paragraphs: ["Die Website und begrenzte technische Aufzeichnungen laufen auf der Infrastruktur von Cloudflare. Das Demo-Cookie hält den Beginn des Testzugangs fest; die Analyse misst die Produktnutzung; technische Telemetrie dient der Erkennung und Behebung von Fehlern. Die Sprachwahl wird im Browser gespeichert. Kartendaten werden auf dem Smartphone angezeigt; die lokale Anzeige kann im Browser gespeichert bleiben."] },
        { heading: "Rechtsgrundlagen", paragraphs: ["Der Demo-Zugang und die Anzeige der vom Nutzer selbst ausgelesenen Daten sind zur Bereitstellung des angefragten Testdienstes erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Begrenzte Nutzungsanalysen und technische Telemetrie verarbeiten wir aufgrund unseres berechtigten Interesses, die Betaversion zu überprüfen und Fehler zu beheben (Art. 6 Abs. 1 lit. f DSGVO); die Daten beschränken wir auf die oben genannten technischen Felder. Falls Sie dieser Verarbeitung widersprechen, schreiben Sie an die oben genannte Adresse.", "Cloudflare stellt das Hosting der Website und des serverseitigen App-Teils bereit. Daten in der lokalen Kartenansicht bleiben im Browser, bis der Nutzer sie löscht; für Analyse- und Telemetrieaufzeichnungen gelten die oben genannten Aufbewahrungsfristen."] },
        { heading: "Ihre Rechte", paragraphs: ["Über die oben genannte E-Mail-Adresse können Sie Informationen über die Verarbeitung, Auskunft, Berichtigung, Löschung oder Einschränkung der Verarbeitung verlangen, Widerspruch einlegen und, soweit anwendbar, Datenübertragbarkeit verlangen. Sie können sich bei der zuständigen Datenschutzbehörde beschweren. Wenn Sie die Daten dieser Website im Browser löschen, entfernen Sie die lokal gespeicherte Kartenansicht und Ihre Sprachwahl.", "Der Demo-Zugang ist freiwillig. Ohne das erforderliche technische Cookie kann der Server die Dauer des Demozeitraums nicht bestätigen. Auf Grundlage der Analyse- und Telemetrieaufzeichnungen treffen wir keine automatisierten Entscheidungen über Nutzer."] },
      ],
    },
  },
};
