export const TACHOCOMMAND_VERSIONS = Object.freeze({
  product: "V22.0",
  site: "V22.0",
  app: "V22.0",
  cardEngine: "parser-native-history-2026.09.19",
  transport: "golden-0.32c",
});

export function formatTachoCommandVersionLine() {
  return [
    "Site " + TACHOCOMMAND_VERSIONS.site,
    "App " + TACHOCOMMAND_VERSIONS.app,
    "Card " + TACHOCOMMAND_VERSIONS.cardEngine,
    "Transport " + TACHOCOMMAND_VERSIONS.transport,
  ].join(" · ");
}
