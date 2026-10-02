"use client";
import { useState } from "react";
import type { FieldProvenHistoryDay } from "../../lib/field-proven-product-state.js";
import type { AppLocale } from "../../lib/product-app-copy.js";
import styles from "./field-proven-premium-ui.module.css";

const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const zoomLabel = {sr: "Zum", en: "Zoom", de: "Zoom", ru: "Масштаб", bg: "Мащаб", ro: "Zoom", hu: "Nagyítás"};
export default function DayTimeline({ day, kinds, locale }: {
  day: FieldProvenHistoryDay;
  kinds: Record<string, string>;
  locale: AppLocale;
}) {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const segment = selected === null ? null : day.segments[selected];
  const step = zoom >= 4 ? 15 : 60;
  return <section className={styles.dayTimelinePanel}>
    <div className={styles.timelineControls}>
      <span>{zoomLabel[locale]} · {zoom}×</span>
      <button type="button" disabled={zoom === 1} aria-label={`${zoomLabel[locale]} −`} onClick={() => setZoom(zoom / 2)}>−</button>
      <button type="button" disabled={zoom === 8} aria-label={`${zoomLabel[locale]} +`} onClick={() => setZoom(zoom * 2)}>+</button>
    </div>
    <div className={styles.timelineScroll}>
      <div className={styles.timelineCanvas} style={{width: `${zoom * 100}%`}}>
        <div className={styles.timelineRuler} aria-hidden="true">
          {Array.from({length: 1440 / step + 1}, (_, i) => i * step).map(minute =>
            <span key={minute} style={{left: `${minute / 1440 * 100}%`}}>
              {minute % 60 === 0 && (zoom > 1 || minute % 120 === 0) ? clock(minute) : ""}
            </span>)}
        </div>
        <div className={styles.dayTimelineTrack}>
          {day.segments.map((seg, i) => seg.startMinute !== null && seg.endMinute !== null ?
            <button type="button" key={i} className={`${styles.timelineSegment} ${styles[seg.kind]}`}
              style={{left: `${seg.startMinute / 1440 * 100}%`, width: `${(seg.endMinute - seg.startMinute) / 1440 * 100}%`}}
              title={`${kinds[seg.kind]} ${clock(seg.startMinute)}–${clock(seg.endMinute)} · ${seg.minutes} min`}
              aria-label={`${kinds[seg.kind]} ${clock(seg.startMinute)}–${clock(seg.endMinute)} · ${seg.minutes} min`}
              aria-pressed={selected === i} onClick={() => setSelected(i)} /> : null)}
        </div>
      </div>
    </div>
    <div className={styles.timelineLegend}>
      {Object.entries(kinds).map(([kind, label]) => <span key={kind}><i className={styles[kind]} />{label}</span>)}
    </div>
    {segment && segment.startMinute !== null && segment.endMinute !== null &&
      <p aria-live="polite">{kinds[segment.kind]} · {clock(segment.startMinute)}–{clock(segment.endMinute)} · {segment.minutes} min</p>}
  </section>;
}
