import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

test("service worker never intercepts API or admin responses, but retains offline app navigation", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const handlers = new Map();
  const cached = [];
  const store = {
    put: async (request) => cached.push(request.url),
    addAll: async () => {},
  };
  const context = {
    self: {
      location: { origin: "https://tachocommand.com" },
      addEventListener(name, handler) { handlers.set(name, handler); },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      async open() { return store; },
      async keys() { return []; },
      async match() { return null; },
      async delete() { return true; },
    },
    fetch: async () => ({ ok: true, clone() { return this; } }),
    URL,
  };
  runInNewContext(source, context);
  const handle = handlers.get("fetch");
  assert.equal(typeof handle, "function");

  for (const path of ["/api/trial", "/api/admin/overview", "/admin", "/admin/settings"]) {
    let intercepted = false;
    handle({ request: { method: "GET", url: context.self.location.origin + path, mode: "navigate" }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, `${path} must bypass cache`);
  }

  let response;
  handle({
    request: { method: "GET", url: "https://tachocommand.com/app", mode: "navigate" },
    respondWith(promise) { response = promise; },
    waitUntil(promise) { response = Promise.all([response, promise]); },
  });
  assert.ok(response);
  await response;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(cached, ["https://tachocommand.com/app"]);
});
