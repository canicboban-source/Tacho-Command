import { pathToFileURL } from "node:url";

export const RETENTION_CRON = "0 3 * * *";

/** Preserve other cron jobs while enabling the independent daily retention purge. */
export async function ensureRetentionSchedule({ accountId, token, fetchImpl = fetch }) {
  if (!accountId || !token) throw new Error("Cloudflare account and token are required");
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/tachocommand/schedules`;
  const headers = { Authorization: `Bearer ${token}` };
  const read = await fetchImpl(url, { headers });
  const existing = await read.json();
  if (!read.ok || existing.success !== true || !Array.isArray(existing.result?.schedules)) {
    throw new Error("Cannot read current Worker schedules; refusing to overwrite them");
  }
  const crons = existing.result.schedules.map(({ cron }) => cron);
  if (crons.some((cron) => typeof cron !== "string" || !cron.trim())) {
    throw new Error("Current Worker schedules are invalid");
  }
  if (crons.includes(RETENTION_CRON)) return { status: "already_enabled" };

  const update = await fetchImpl(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify([...crons, RETENTION_CRON].map((cron) => ({ cron }))),
  });
  const updated = await update.json();
  const actual = updated.result?.schedules?.map(({ cron }) => cron);
  if (!update.ok || updated.success !== true || !Array.isArray(actual) ||
      ![...crons, RETENTION_CRON].every((cron) => actual.includes(cron))) {
    throw new Error("Could not verify daily retention schedule");
  }
  return { status: "enabled" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await ensureRetentionSchedule({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
  });
  console.log(`Daily retention schedule ${result.status}`);
}
