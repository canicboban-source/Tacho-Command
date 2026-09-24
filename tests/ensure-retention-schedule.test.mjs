import assert from "node:assert/strict";
import test from "node:test";
import { ensureRetentionSchedule, RETENTION_CRON } from "../scripts/ensure-retention-schedule.mjs";

test("adding the retention cron preserves all existing Worker schedules", async () => {
  const requests = [];
  const result = await ensureRetentionSchedule({
    accountId: "test-account",
    token: "test-token",
    async fetchImpl(url, options) {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return { success: true, result: { schedules: options.method === "PUT"
            ? JSON.parse(options.body)
            : [{ cron: "15 1 * * *" }] } };
        },
      };
    },
  });
  assert.equal(result.status, "enabled");
  assert.deepEqual(JSON.parse(requests[1].options.body), [
    { cron: "15 1 * * *" }, { cron: RETENTION_CRON },
  ]);
});
