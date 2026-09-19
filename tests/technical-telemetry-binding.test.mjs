import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const hosting = JSON.parse(
  fs.readFileSync(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
);
const independentHosting = JSON.parse(
  fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
const packageManifest = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const viteSource = fs.readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const dbSource = fs.readFileSync(new URL("../db/index.ts", import.meta.url), "utf8");

test("hosting, local worker config, and runtime DB accessor agree on the DB binding", () => {
  assert.equal(hosting.d1, "DB");
  assert.match(viteSource, /const \{ d1, r2 \} = hostingConfig/);
  assert.match(viteSource, /binding:\s*d1/);
  assert.match(dbSource, /if \(!env\.DB\)/);
  assert.match(dbSource, /drizzle\(env\.DB, \{ schema \}\)/);
});

test("D1 preparation does not silently enable R2 or change the hosting project", () => {
  assert.equal(hosting.r2, null);
  assert.equal(hosting.project_id, "appgprj_6a84bff118b481919b6ed5d54636f18b");
});

test("independent Cloudflare hosting is explicit and keeps the DB binding stable", () => {
  assert.equal(independentHosting.name, "tachocommand");
  assert.equal(independentHosting.main, "./worker/index.ts");
  assert.deepEqual(independentHosting.compatibility_flags, ["nodejs_compat"]);
  assert.deepEqual(independentHosting.d1_databases, [
    {
      binding: "DB",
      database_name: "tachocommand-prod",
      database_id: "0796463f-28ee-485a-8cc4-40b213e7ae26",
      migrations_dir: "./drizzle",
    },
  ]);
  assert.equal(independentHosting.images.binding, "IMAGES");
  assert.equal(
    packageManifest.scripts["build:cloudflare"],
    "TACHOCOMMAND_CLOUDFLARE_DEPLOY=1 bash scripts/build-verified.sh",
  );
  assert.match(viteSource, /configPath:\s*"\.\/wrangler\.jsonc"/);
});
