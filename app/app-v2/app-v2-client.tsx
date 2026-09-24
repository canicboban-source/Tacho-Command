"use client";

import { useEffect, useMemo, useState } from "react";
import FieldProvenPremiumUi from "../app/field-proven-premium-ui";
import { createFieldProvenProductState } from "../../lib/field-proven-product-state.js";
import {
  cardStateFromLastGoodCardSnapshot,
  loadLastGoodCardSnapshot,
} from "../../lib/last-good-card-snapshot.js";
import { formatTachoCommandVersionLine } from "../../lib/product-version.js";
import { createAppV2LiveSession } from "../../lib/app-v2-live-session.js";
import { beginAppV2CardRead, createAppV2CardSession } from "../../lib/app-v2-card-session.js";
import { runBrowserAppV2GoldenCardRead } from "../../lib/app-v2-card-transport-controller-bridge.js";
import { openBrowserAppV2FieldTransport } from "../../lib/app-v2-field-transport.js";
import { phoneTimeZone, phoneUtcOffsetLabel, projectCardTimelineForPhone } from "../../lib/app-v2-phone-timeline.js";
import { calendarFortnightFromMonday } from "../../lib/app-v2-monday-fortnight.js";
import { runAppV2LiveAttemptWithTelemetry } from "../../lib/app-v2-technical-telemetry-bridge.js";
import { reportAppV2CardReadOutcome } from "../../lib/app-v2-card-telemetry.js";
import styles from "./app-v2.module.css";

type RestoreState = "checking" | "restored" | "empty" | "invalid";
type LiveRunState = "idle" | "running" | "success" | "error";
type CardReadProgress = Readonly<{
  submessages: number;
  byteLength: number;
  complete: boolean;
}>;

function formatRestoreTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppV2Client() {
  const [restoreState, setRestoreState] = useState<RestoreState>("checking");
  const [cardState, setCardState] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [capturedAtIso, setCapturedAtIso] = useState<string | null>(null);
  const [liveRunState, setLiveRunState] = useState<LiveRunState>("idle");
  const [liveSession, setLiveSession] = useState(() => createAppV2LiveSession());
  const [lastLiveSnapshot, setLastLiveSnapshot] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [cardSession, setCardSession] = useState(() => createAppV2CardSession());
  const [cardReadProgress, setCardReadProgress] = useState<CardReadProgress | null>(null);
  const [cardReadOutcome, setCardReadOutcome] = useState<string | null>(null);
  const [phoneZoneKey, setPhoneZoneKey] = useState<string | null>(null);
  const [cardTelemetry, setCardTelemetry] = useState<{ status: string; attemptCode: string | null } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const snapshot = loadLastGoodCardSnapshot(window.localStorage);
        if (!snapshot) {
          setRestoreState("empty");
          return;
        }

        const restoredCard = cardStateFromLastGoodCardSnapshot(snapshot);
        if (!restoredCard) {
          setRestoreState("invalid");
          return;
        }

        setCardState(restoredCard);
        setCapturedAtIso(snapshot.capturedAtIso);
        setCardSession(createAppV2CardSession({
          currentCard: restoredCard,
          capturedAtIso: snapshot.capturedAtIso,
        }));
        setRestoreState("restored");
      } catch {
        setRestoreState("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncPhoneTime = () => {
      const zone = phoneTimeZone();
      const date = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const next = zone + "|" + phoneUtcOffsetLabel() + "|" + date;
      setPhoneZoneKey((previous) => previous === next ? previous : next);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncPhoneTime();
    };
    syncPhoneTime();
    window.addEventListener("focus", syncPhoneTime);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(syncPhoneTime, 30_000);
    return () => {
      window.removeEventListener("focus", syncPhoneTime);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  const displayCard = useMemo(() => {
    if (!phoneZoneKey || !cardState) return cardState ?? {};
    const timeZone = phoneZoneKey.split("|")[0];
    const projected = projectCardTimelineForPhone(cardState, timeZone);
    // Two calendar weeks: previous Monday through current local day. Preserve
    // the downloaded UTC card snapshot; these figures are display-only.
    return Object.freeze({
      ...projected,
      fortnightDrivingMinutes: calendarFortnightFromMonday(projected.historyDays, { timeZone }),
    });
  }, [cardState, phoneZoneKey]);

  const state = useMemo(() => {
    const latestDiagnostics = liveSession.productLive ?? {};
    const stableLive = lastLiveSnapshot ?? { connected: false };

    return createFieldProvenProductState({
      live: liveRunState === "running"
        ? { connected: false }
        : {
            ...stableLive,
            attemptCode: latestDiagnostics.attemptCode ?? stableLive.attemptCode,
            telemetryAcceptedCount:
              latestDiagnostics.telemetryAcceptedCount ?? stableLive.telemetryAcceptedCount,
          },
      card: displayCard,
      localeLabel: "SR · Srpski",
    });
  }, [displayCard, lastLiveSnapshot, liveRunState, liveSession]);

  const restoredLabel = formatRestoreTime(capturedAtIso);

  const runLiveRead = async () => {
    if (liveRunState === "running" || cardSession.busy) return;
    setLiveRunState("running");
    setLiveSession(createAppV2LiveSession({ phase: "connecting" }));

    const result = await runAppV2LiveAttemptWithTelemetry({
      openTransport: () => openBrowserAppV2FieldTransport(),
    });

    if (result.status === "live") {
      const confirmedSnapshot = {
        ...result.session.productLive,
        connected: false,
        snapshotConfirmed: true,
        attemptCode: result.attemptCode,
        telemetryAcceptedCount: result.telemetryAcceptedCount,
      };
      setLastLiveSnapshot(confirmedSnapshot);
      setLiveSession(createAppV2LiveSession({
        phase: "disconnected",
        deviceLabel: result.session.productLive.deviceLabel,
        lastLiveReadLabel: result.session.productLive.lastLiveReadLabel,
        attemptCode: result.attemptCode,
        telemetryAcceptedCount: result.telemetryAcceptedCount,
      }));
      setLiveRunState("success");
      return;
    }

    setLiveSession(createAppV2LiveSession({
      phase: "error",
      deviceLabel: result.session.productLive?.deviceLabel,
      attemptCode: result.attemptCode,
      telemetryAcceptedCount: result.telemetryAcceptedCount,
      errorText: result.session.errorText,
    }));
    setLiveRunState("error");
  };

  const runCardRead = async () => {
    if (cardSession.busy || liveRunState === "running") return;

    const readingSession = beginAppV2CardRead(cardSession);
    setCardSession(readingSession);
    setCardReadProgress(Object.freeze({ submessages: 0, byteLength: 0, complete: false }));
    setCardReadOutcome(null);
    setCardTelemetry(null);

    const result = await runBrowserAppV2GoldenCardRead({
      session: readingSession,
      storage: window.localStorage,
      capturedAtIso: new Date().toISOString(),
      onProgress: (progress: CardReadProgress) => setCardReadProgress(progress),
    });

    if (result.session) setCardSession(result.session);
    setCardReadOutcome(result.status);

    // The card session is already complete; telemetry cannot alter the read result.
    void reportAppV2CardReadOutcome({ status: result.status }).then((report) => {
      setCardTelemetry({ status: report.status, attemptCode: report.attemptCode });
    });

    if (result.status === "accepted" && result.session?.currentCard) {
      setCardState(result.session.currentCard);
      setCapturedAtIso(result.session.capturedAtIso);
      setRestoreState("restored");
      return;
    }
  };

  return (
    <div className={styles.stage}>
      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi
          state={state}
          controls={{
            phase: cardSession.busy
              ? "card-reading"
              : liveRunState === "running"
                ? "connecting"
                : liveRunState === "error" || cardSession.phase === "error"
                  ? "error"
                  : liveRunState === "success"
                    ? "connected"
                    : "idle",
            restoreState,
            restoredLabel,
            errorText: cardSession.errorText ?? liveSession.errorText ?? null,
            cardReadProgress,
            cardReadPhase: cardSession.phase,
            cardReadOutcome,
            cardTelemetry,
            phoneTimeLabel: phoneZoneKey ? phoneZoneKey.split("|")[0] + " · " + phoneZoneKey.split("|")[1] : null,
            versionLine: formatTachoCommandVersionLine(),
            onConnect: runLiveRead,
            onReadCard: runCardRead,
          }}
        />
      </section>
    </div>
  );
}
