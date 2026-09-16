"use client";

import { useMemo, useState } from "react";
import styles from "./premium-app.module.css";

type TabId = "live" | "periods" | "history" | "attention" | "card";
type MetricId = "activity" | "continuous" | "break" | "today" | "week";

type Metric = Readonly<{
  id: MetricId;
  label: string;
  source: string;
  value: string;
  hint: string;
  explanation: string;
}>;

const metrics: readonly Metric[] = Object.freeze([
  Object.freeze({
    id: "activity",
    label: "Trenutna aktivnost",
    source: "F903",
    value: "—",
    hint: "DRIVE • WORK • AVAILABILITY • REST",
    explanation:
      "Prikazuje trenutno stanje vozača koje tahograf prijavljuje za slot 1. Kada nema aktivne i potvrđene veze, TachoCommand ne izmišlja stanje.",
  }),
  Object.freeze({
    id: "continuous",
    label: "Neprekidna vožnja",
    source: "F923",
    value: "—",
    hint: "Od poslednje kvalifikovane pauze",
    explanation:
      "Vreme neprekidne vožnje koje prijavljuje tahograf. Ovo je LIVE podatak; istorijska analiza i pravni profil ostaju odvojeni slojevi.",
  }),
  Object.freeze({
    id: "break",
    label: "Kumulativna pauza",
    source: "F925",
    value: "—",
    hint: "Trenutno akumulirana pauza",
    explanation:
      "Kumulativno trajanje pauze koje tahograf prijavljuje. Bez potvrđenog odgovora vrednost ostaje prazna, umesto da prikazuje demo broj.",
  }),
  Object.freeze({
    id: "today",
    label: "Današnja vožnja",
    source: "F99A",
    value: "—",
    hint: "Aktuelni dnevni zbir",
    explanation:
      "Dnevni zbir vožnje sa tahografa kada je DID podržan. Ako uređaj ne vrati pouzdanu vrednost, ekran mora ostati neutralan.",
  }),
  Object.freeze({
    id: "week",
    label: "Nedeljna vožnja",
    source: "F99B",
    value: "—",
    hint: "Aktuelni nedeljni zbir",
    explanation:
      "Nedeljni zbir vožnje sa tahografa kada je dostupan. Ne meša se sa 56-dnevnom istorijom kartice.",
  }),
]);

const navItems: readonly Readonly<{ id: TabId; label: string; glyph: string }>[] = Object.freeze([
  Object.freeze({ id: "live", label: "LIVE", glyph: "●" }),
  Object.freeze({ id: "periods", label: "Periodi", glyph: "▦" }),
  Object.freeze({ id: "history", label: "56 dana", glyph: "≋" }),
  Object.freeze({ id: "attention", label: "Pažnja", glyph: "△" }),
  Object.freeze({ id: "card", label: "Kartica", glyph: "▣" }),
]);

function EmptyState({ eyebrow, title, text, action }: Readonly<{ eyebrow: string; title: string; text: string; action?: string }>) {
  return (
    <section className={styles.emptyState}>
      <div className={styles.emptyIcon}>TC</div>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action ? <div className={styles.emptyAction}>{action}<span aria-hidden="true">→</span></div> : null}
    </section>
  );
}

function LiveScreen({ onMetric, onConnect }: Readonly<{ onMetric: (id: MetricId) => void; onConnect: () => void }>) {
  const continuous = metrics.find((metric) => metric.id === "continuous")!;
  const secondary = metrics.filter((metric) => metric.id !== "continuous");

  return (
    <div className={styles.screenStack}>
      <section className={styles.connectionHero}>
        <div className={styles.heroTopline}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>TAHOGRAF NIJE POVEZAN</span>
          <span className={styles.privacyChip}>LOCAL-FIRST</span>
        </div>

        <div className={styles.heroCopy}>
          <div>
            <p className={styles.eyebrow}>LIVE COCKPIT</p>
            <h1>Mirna smena počinje jasnim stanjem.</h1>
            <p>Bez potvrđene BLE sesije nema izmišljenih vrednosti, zelenih statusa ni lažnog osećaja sigurnosti.</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={onConnect}>
            <span aria-hidden="true">⌁</span>
            Poveži tahograf
          </button>
        </div>

        <div className={styles.heroFoot}>
          <span>Poslednje očitavanje</span>
          <strong>Još nema očitavanja</strong>
        </div>
      </section>

      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>TAHOGRAF • SLOT 1</p>
          <h2>Ono što treba da znaš sada</h2>
        </div>
        <span className={styles.sectionNote}>Dodirni karticu za objašnjenje</span>
      </div>

      <section className={styles.metricGrid} aria-label="LIVE vrednosti">
        <button type="button" className={`${styles.metricCard} ${styles.metricCardPrimary}`} onClick={() => onMetric("continuous")}>
          <div className={styles.metricHead}><span>TIME</span><span>{continuous.source}</span></div>
          <span className={styles.metricLabel}>{continuous.label}</span>
          <strong className={styles.metricValue}>{continuous.value}</strong>
          <span className={styles.metricHint}>{continuous.hint}</span>
          <span className={styles.metricArrow} aria-hidden="true">→</span>
        </button>

        {secondary.map((metric) => (
          <button type="button" className={styles.metricCard} key={metric.id} onClick={() => onMetric(metric.id)}>
            <div className={styles.metricHead}><span>LIVE</span><span>{metric.source}</span></div>
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong className={`${styles.metricValue} ${styles.metricValueSmall}`}>{metric.value}</strong>
            <span className={styles.metricHint}>{metric.hint}</span>
            <span className={styles.metricArrow} aria-hidden="true">→</span>
          </button>
        ))}
      </section>

      <section className={styles.confidenceStrip} aria-label="Granice poverenja">
        <div><span className={styles.miniDot} aria-hidden="true" />Bez aktivne veze</div>
        <div>Bez raw kartičnih vrednosti</div>
        <div>Bez lažnog „OK” stanja</div>
      </section>
    </div>
  );
}

function PeriodsScreen() {
  return (
    <div className={styles.screenStack}>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>PERIODI</p>
        <h1>Sažeci bez kopanja po danima.</h1>
        <p>Danas, tekuća nedelja i 14 dana dobijaju sadržaj tek kada postoji pouzdan izvor podataka.</p>
      </div>
      <div className={styles.periodSwitcher} aria-label="Period">
        <button type="button" className={styles.selectedPeriod}>Danas</button>
        <button type="button">Nedelja</button>
        <button type="button">14 dana</button>
      </div>
      <EmptyState
        eyebrow="ČISTO STANJE"
        title="Nema perioda za prikaz"
        text="Potrebno je očitati karticu ili završiti pouzdanu LIVE sesiju da bismo napravili zbir."
        action="Očitaj karticu da popuniš ovaj ekran"
      />
    </div>
  );
}

function HistoryScreen() {
  return (
    <div className={styles.screenStack}>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>CARD INTELLIGENCE</p>
        <h1>56 dana. Jedna jasna vremenska linija.</h1>
        <p>DRIVING, WORK, AVAILABILITY i REST crtaju se samo iz stvarno parsirane istorije kartice.</p>
      </div>

      <section className={styles.timelineShell} aria-label="56-dnevni pregled">
        <div className={styles.timelineTop}>
          <div><span className={styles.sectionNote}>56-DAY WINDOW</span><strong>Čeka očitavanje kartice</strong></div>
          <div className={styles.timelineCount}>0 / 56</div>
        </div>
        <div className={styles.timelineRails} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => <span key={index} />)}
        </div>
        <div className={styles.timelineLegend}>
          <span><i className={styles.legendDrive} />DRIVE</span>
          <span><i className={styles.legendWork} />WORK</span>
          <span><i className={styles.legendAvailability} />AVAIL.</span>
          <span><i className={styles.legendRest} />REST</span>
        </div>
      </section>

      <EmptyState
        eyebrow="BEZ DEMO ISTORIJE"
        title="Još nema 56-dnevnog pregleda"
        text="Kada se kartica stvarno očita i parser vrati validnu strukturu, ovaj ekran dobija dnevne trake i proverljive zbirove."
      />
    </div>
  );
}

function AttentionScreen() {
  return (
    <div className={styles.screenStack}>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>PAŽNJA</p>
        <h1>Upozorenje nije presuda.</h1>
        <p>Preventivni signal, dostignuti prag i događaj za pravnu proveru ostaju vizuelno i semantički odvojeni.</p>
      </div>

      <section className={styles.attentionLegend} aria-label="Vrste upozorenja">
        <div><span className={`${styles.attentionCode} ${styles.amber}`}>AMBER</span><p>Preventivno upozorenje pre relevantnog praga.</p></div>
        <div><span className={`${styles.attentionCode} ${styles.limit}`}>LIMIT</span><p>Relevantna granica je dostignuta.</p></div>
        <div><span className={`${styles.attentionCode} ${styles.review}`}>REVIEW</span><p>Događaj traži proveru u poznatom pravnom profilu.</p></div>
      </section>

      <EmptyState
        eyebrow="TRUTH FIRST"
        title="Nema analiziranih događaja"
        text="Bez očitane istorije i izabranog pravnog profila TachoCommand ne proglašava prekršaj."
      />
    </div>
  );
}

function CardScreen() {
  return (
    <div className={styles.screenStack}>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>KARTICA</p>
        <h1>Identitet samo koliko je potrebno.</h1>
        <p>Broj kartice nije deo normalnog proizvoda. Status i pouzdani metapodaci dolaze tek nakon stvarnog očitavanja.</p>
      </div>

      <section className={styles.cardSurface}>
        <div className={styles.cardMark}>ID</div>
        <div className={styles.cardCopy}>
          <span>DRIVER CARD • SLOT 1</span>
          <strong>Kartica nije očitana</strong>
          <p>Ime, važenje i status pojavljuju se samo kada ih možemo pouzdano izvesti iz stvarnog toka.</p>
        </div>
        <div className={styles.cardGlyph} aria-hidden="true">▣</div>
      </section>

      <section className={styles.privacyPanel}>
        <div><span aria-hidden="true">◎</span><strong>Privacy boundary</strong></div>
        <p>Nema broja kartice, registracije vozila, lokacije ni raw bajtova u ovom prikazu. Tehnička dijagnostika mora ostati odvojena od ličnih vrednosti vozača.</p>
      </section>
    </div>
  );
}

export default function PremiumAppClient() {
  const [tab, setTab] = useState<TabId>("live");
  const [metricId, setMetricId] = useState<MetricId | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);

  const activeMetric = useMemo(
    () => metrics.find((metric) => metric.id === metricId) ?? null,
    [metricId],
  );

  const screen = tab === "live"
    ? <LiveScreen onMetric={setMetricId} onConnect={() => setConnectionOpen(true)} />
    : tab === "periods"
      ? <PeriodsScreen />
      : tab === "history"
        ? <HistoryScreen />
        : tab === "attention"
          ? <AttentionScreen />
          : <CardScreen />;

  return (
    <div className={styles.appShell}>
      <div className={`${styles.ambient} ${styles.ambientOne}`} aria-hidden="true" />
      <div className={`${styles.ambient} ${styles.ambientTwo}`} aria-hidden="true" />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>TC</div>
          <div><strong>TachoCommand</strong><span>DRIVER COCKPIT</span></div>
        </div>
        <div className={styles.betaBadge}>OPEN BETA • PREMIUM SHELL</div>
      </header>

      <main className={styles.content}>{screen}</main>

      <nav className={styles.bottomNav} aria-label="Glavna navigacija">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={active ? styles.activeNav : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <span className={styles.navGlyph} aria-hidden="true">{item.glyph}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {activeMetric ? (
        <div className={styles.overlay} role="presentation" onClick={() => setMetricId(null)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="metric-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHead}>
              <div><p className={styles.eyebrow}>ŠTA OVO ZNAČI</p><h2 id="metric-title">{activeMetric.label}</h2></div>
              <button type="button" className={styles.iconButton} onClick={() => setMetricId(null)} aria-label="Zatvori">×</button>
            </div>
            <div className={styles.detailSource}><span>Izvor</span><strong>{activeMetric.source}</strong></div>
            <p className={styles.detailDescription}>{activeMetric.explanation}</p>
            <div className={styles.truthNote}><span aria-hidden="true">△</span><span>Trenutna vrednost je prazna jer nema aktivne i potvrđene tahograf sesije.</span></div>
            <button type="button" className={styles.sheetAction} onClick={() => setMetricId(null)}>Razumem</button>
          </section>
        </div>
      ) : null}

      {connectionOpen ? (
        <div className={styles.overlay} role="presentation" onClick={() => setConnectionOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="connect-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHead}>
              <div><p className={styles.eyebrow}>POVEZIVANJE</p><h2 id="connect-title">Četiri jasne faze. Bez nagađanja.</h2></div>
              <button type="button" className={styles.iconButton} onClick={() => setConnectionOpen(false)} aria-label="Zatvori">×</button>
            </div>
            <div className={styles.phaseList}>
              {["Bluetooth izbor uređaja", "GATT veza", "Transport i credits", "LIVE očitavanje"].map((phase, index) => (
                <div className={styles.phase} key={phase}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{phase}</strong>
                  <em>ČEKANJE</em>
                </div>
              ))}
            </div>
            <div className={styles.truthNote}><span aria-hidden="true">⌁</span><span>Premium shell ne duplira BLE implementaciju. Dok ne vratimo v37 source pod punu verzionu kontrolu, hardverski tok ostaje na postojećoj dokazanoj putanji.</span></div>
            <a className={styles.fieldTestLink} href="/field-test">Nastavi na dokazanu BLE putanju →</a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
