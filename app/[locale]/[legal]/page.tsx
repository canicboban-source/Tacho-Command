import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLegalDocument, isLegalLocale, legalCopy, legalDocuments, legalLocales } from "../../legal-copy";
import LegalLanguageSelect from "../../legal-language-select";

export function generateStaticParams() {
  return legalLocales.flatMap((locale) => legalDocuments.map((legal) => ({ locale, legal })));
}

type Params = Readonly<{ params: Promise<{ locale: string; legal: string }> }>;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, legal } = await params;
  if (!isLegalLocale(locale) || !isLegalDocument(legal)) return {};
  const copy = legalCopy[locale][legal];
  return { title: copy.title, description: copy.description,
    alternates: { canonical: `/${locale}/${legal}`, languages: {
      sr: `/sr/${legal}`, en: `/en/${legal}`, de: `/de/${legal}`, "x-default": `/sr/${legal}`,
    } },
  };
}

function paragraph(text: string) {
  return text.split(/(info@tachocommand\.com)/g).map((part, index) =>
    part === "info@tachocommand.com"
      ? <a key={index} href="mailto:info@tachocommand.com">{part}</a>
      : <span key={index} style={{ whiteSpace: "pre-line" }}>{part}</span>
  );
}

export default async function LocalizedLegalPage({ params }: Params) {
  const { locale, legal } = await params;
  if (!isLegalLocale(locale) || !isLegalDocument(legal)) notFound();
  const page = legalCopy[locale][legal];
  const back = { sr: "← Nazad na početnu", en: "← Back to home", de: "← Zurück zur Startseite" }[locale];
  return (
    <main className="legal-shell" lang={locale}>
      <Link className="landing-brand" href={`/${locale}`}>
        <span className="landing-logo">TC</span>
        <strong>Tacho<span>Command</span></strong>
      </Link>
      <LegalLanguageSelect locale={locale} legal={legal} />
      <article>
        <span className="landing-kicker">{legal === "terms" ? "CLOSED BETA" : "BETA"}</span>
        <h1>{page.title}</h1>
        <p className="legal-updated">{page.updated}</p>
        {page.sections.map((section) => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((text, index) => <p key={index}>{paragraph(text)}</p>)}
        </section>)}
      </article>
      <Link className="legal-back" href={`/${locale}`}>{back}</Link>
    </main>
  );
}
