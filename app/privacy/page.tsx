import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Privatnost",
  description: "Privatnost u TachoCommand beta verziji: kontakt, podaci na uređaju, analitika i tehnička telemetrija.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage kicker="BETA" title="Privatnost" updated="Ažurirano 24. septembra 2026.">
      <h2>Ko je odgovoran i kako da nas kontaktirate</h2>
      <p>Canic Boban, Beim Spitzerriegel 2, 2500 Baden, Austrija. Za pitanja o podacima i zahteve za pristup ili brisanje pišite na <a href="mailto:info@tachocommand.com">info@tachocommand.com</a>.</p>
      <p>TachoCommand trenutno vodi fizičko lice. Kupovina i naplata nisu aktivne.</p>
      <h2>Demo pristup</h2>
      <p>TachoCommand postavlja tehnički, HttpOnly kolačić da bi server potpisao početak trodnevnog demo perioda. Kolačić ne sadrži ime, e-mail, broj kartice vozača, registraciju ili lokaciju.</p>

      <h2>Minimalna product analytics</h2>
      <p>Radi razumevanja korišćenja proizvoda beležimo ograničene događaje kao što su otvaranje početne strane ili aplikacije, pokretanje demo pristupa, klik na vodič i izbor jezika. Analitika čuva nasumični identifikator sesije, vrstu događaja, deo proizvoda, jezik, grubu kategoriju izvora posete i vreme prijema na serveru. Identifikator sesije može predstavljati podatak o ličnosti; ne predstavljamo ove događaje kao potpuno anonimne.</p>
      <p>U ovu product analytics evidenciju ne upisujemo ime vozača, broj kartice, registraciju, GPS lokaciju, naziv Bluetooth uređaja, raw tahografske podatke, pun URL, query parametre, IP adresu ili user-agent. Nasumični identifikator je vezan za browser sesiju, a analytics događaji se čuvaju najviše 90 dana.</p>

      <h2>Tehnička telemetrija</h2>
      <p>Tokom očitavanja aplikacija može automatski poslati ograničene tehničke događaje potrebne za dijagnostiku: fazu, ishod, podržani DID, trajanje, NRC, porodicu uređaja, tehnički error code i support code pokušaja. Ova telemetrija ne sadrži identitet vozača, broj kartice, registraciju, lokaciju, pune Bluetooth nazive, raw byte sadržaj niti stvarne vrednosti sa tahografa. Tehnička telemetrija se čuva najviše 60 dana.</p>

      <h2>Podaci kartice i aplikacije</h2>
      <p>Očitani podaci kartice namenjeni prikazu u TachoCommand-u obrađuju se za funkcije aplikacije. Lični raw .ddd field fixture ne objavljujemo u javnom repozitorijumu. Lokalni snapshot poslednjeg uspešnog očitavanja, kada je funkcija dostupna, čuva se u pregledaču na uređaju.</p>

      <h2>Bluetooth</h2>
      <p>Pregledač prikazuje svoj izbor uređaja. TachoCommand ne uspostavlja Bluetooth vezu bez jasne radnje korisnika.</p>

      <h2>Hosting i svrha obrade</h2>
      <p>Sajt i ograničena tehnička evidencija rade preko Cloudflare infrastrukture. Kolačić za demo služi da sačuva početak probnog pristupa; analitika služi merenju upotrebe proizvoda; tehnička telemetrija služi otkrivanju i rešavanju grešaka. Jezički izbor se čuva u pregledaču. Podaci sa kartice prikazuju se na telefonu i lokalni prikaz može ostati sačuvan u pregledaču.</p>
      <h2>Pravni osnovi</h2>
      <p>Demo pristup i prikaz podataka koje korisnik sam očita potrebni su za pružanje probne usluge na njegov zahtev (član 6 stav 1 tačka b GDPR). Ograničenu analitiku upotrebe i tehničku telemetriju obrađujemo radi opravdanog interesa da proverimo rad beta verzije i otklonimo greške (član 6 stav 1 tačka f GDPR); podatke ograničavamo na gore navedena tehnička polja. Ako se protivite ovoj obradi, pišite na navedenu adresu.</p>
      <p>Cloudflare pruža hosting sajta i serverskog dela aplikacije. Podaci u lokalnom prikazu kartice ostaju u pregledaču dok ih korisnik ne obriše; za evidenciju analitike i telemetrije važe gore navedeni rokovi.</p>
      <h2>Vaša prava</h2>
      <p>Možete zatražiti informacije o obradi, pristup, ispravku, brisanje ili ograničenje obrade, uložiti prigovor i zatražiti prenosivost tamo gde je primenljiva, putem navedene e-pošte. Imate pravo da podnesete pritužbu nadležnom organu za zaštitu podataka. Brisanjem podataka ovog sajta u pregledaču uklanjate lokalno sačuvani prikaz kartice i izbor jezika.</p>
      <p>Demo pristup je dobrovoljan. Bez neophodnog tehničkog kolačića server ne može da potvrdi trajanje demo perioda. Na osnovu evidencije analitike i telemetrije ne donosimo automatske odluke o korisnicima.</p>
    </LegalPage>
  );
}
