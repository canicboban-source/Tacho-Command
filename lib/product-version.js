export const TACHOCOMMAND_VERSIONS = Object.freeze({
  product: "1.0.0-beta.2",
  site: "1.0.0-beta.2",
  app: "1.0.0-beta.2",
  engine: "V22.0",
  cardEngine: "parser-native-history-2026.09.19",
  transport: "golden-0.32c",
});

export function formatTachoCommandVersionLine() {
  return [
    "Site " + TACHOCOMMAND_VERSIONS.site,
    "App " + TACHOCOMMAND_VERSIONS.app,
    "Engine " + TACHOCOMMAND_VERSIONS.engine,
    "Card " + TACHOCOMMAND_VERSIONS.cardEngine,
    "Transport " + TACHOCOMMAND_VERSIONS.transport,
  ].join(" · ");
}
