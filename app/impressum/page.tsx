import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Podaci izdavača i kontakt za TachoCommand.",
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <LegalPage kicker="BETA" title="Impressum" updated="Ažurirano 24. septembra 2026.">
      <h2>Odgovoran za sadržaj i kontakt</h2>
      <p>Canic Boban<br />Beim Spitzerriegel 2<br />2500 Baden<br />Austrija</p>
      <p>E-pošta: <a href="mailto:info@tachocommand.com">info@tachocommand.com</a></p>
      <h2>Status usluge</h2>
      <p>TachoCommand je u beta periodu. Kupovina i naplata putem ovog sajta trenutno nisu dostupne.</p>
      <p>Podaci o eventualnoj registraciji delatnosti, nadležnom organu i poreskom identifikatoru biće dodati ako su primenljivi, pre otvaranja prodaje.</p>
    </LegalPage>
  );
}
