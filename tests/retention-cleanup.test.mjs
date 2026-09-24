import assert from "node:assert/strict";
import test from "node:test";
import { purgeExpiredTechnicalEvents } from "../lib/retention-cleanup.js";

test("scheduled cleanup deletes each technical table ahead of its stated retention limit", async () => {
  const statements = [];
  const db = {
    prepare(sql) {
      return { bind(value) { return { sql, value }; } };
    },
    async batch(batch) { statements.push(...batch); return [{ success: true }, { success: true }]; },
  };
  const now = Date.UTC(2026, 8, 25);
  await purgeExpiredTechnicalEvents(db, now);
  assert.deepEqual(statements, [
    { sql: "DELETE FROM technical_telemetry_events WHERE created_at < ?", value: now / 1000 - 58 * 86400 },
    { sql: "DELETE FROM product_analytics_events WHERE created_at < ?", value: now / 1000 - 88 * 86400 },
  ]);
});
