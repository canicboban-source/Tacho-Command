import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const productionVersionMeta =
  /<meta(?=[^>]*\bname=["']application-version["'])(?=[^>]*\bcontent=["']V22\.0["'])[^>]*>/i;

test("renders V22.0 production candidate metadata", async (t) => {
  const workerFile = new URL("../dist/server/index.js", import.meta.url);
  if (!existsSync(workerFile)) {
    t.skip("dist/server/index.js not built yet");
    return;
  }
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, productionVersionMeta);
  assert.doesNotMatch(html, /codex-preview/);
});
