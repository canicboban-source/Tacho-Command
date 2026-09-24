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
      <p>Projekat trenutno vodi fizičko lice. TachoCommand je u beta periodu; kupovina i naplata putem ovog sajta nisu dostupne.</p>
      <p>Podaci o registrovanoj delatnosti biće dopunjeni ako se status projekta promeni pre otvaranja prodaje.</p>
    </LegalPage>
  );
}
