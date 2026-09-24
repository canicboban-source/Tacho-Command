"use client";

import { useRouter } from "next/navigation";
import type { LegalDocument, LegalLocale } from "./legal-copy";

const label = { sr: "Jezik", en: "Language", de: "Sprache" };

export default function LegalLanguageSelect({ locale, legal }: { locale: LegalLocale; legal: LegalDocument }) {
  const router = useRouter();
  return <label className="legal-language">
    {label[locale]} <select value={locale} onChange={(event) => {
      const next = event.target.value as LegalLocale;
      window.localStorage.setItem("tachocommand-locale", next);
      router.push(`/${next}/${legal}`);
    }}>
      <option value="sr">SR</option><option value="en">EN</option><option value="de">DE</option>
    </select>
  </label>;
}
