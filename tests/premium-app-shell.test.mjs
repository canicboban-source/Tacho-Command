import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const clientSource = await readFile(new URL("../app/app/premium-app-client.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/app/premium-app.module.css", import.meta.url), "utf8");

test("app entry renders the premium shell candidate", () => {
  assert.match(pageSource, /PremiumAppClient/);
  assert.doesNotMatch(pageSource, /window\.location\.replace/);
});

test("premium shell exposes all five primary product areas", () => {
  for (const label of ["LIVE", "Periodi", "56 dana", "Pažnja", "Kartica"]) {
    assert.match(clientSource, new RegExp(label.replace("56 dana", "56 dana")));
  }
});

test("premium shell keeps unavailable product data truthful", () => {
  assert.match(clientSource, /Tahograf nije povezan/i);
  assert.match(clientSource, /Kartica nije očitana/);
  assert.match(clientSource, /Još nema 56-dnevnog pregleda/);
  assert.match(clientSource, /ne proglašava prekršaj/);
  assert.doesNotMatch(clientSource, /\b(?:115|141|367)\s*min\b/);
});

test("premium shell explains each LIVE DID without changing BLE implementation", () => {
  for (const did of ["F903", "F923", "F925", "F99A", "F99B"]) assert.match(clientSource, new RegExp(did));
  assert.match(clientSource, /href="\/field-test"/);
  assert.doesNotMatch(clientSource, /navigator\.bluetooth|requestDevice|writeValue|TACHO_DIAGNOSTICS/);
});

test("premium shell separates warning, limit and review semantics", () => {
  assert.match(clientSource, /AMBER/);
  assert.match(clientSource, /LIMIT/);
  assert.match(clientSource, /REVIEW/);
  assert.match(clientSource, /Upozorenje nije presuda/);
});

test("premium shell includes mobile-first OLED navigation and sheets", () => {
  assert.match(cssSource, /bottomNav/);
  assert.match(cssSource, /position:\s*fixed/);
  assert.match(cssSource, /@media\s*\(max-width:\s*420px\)/);
  assert.match(cssSource, /overlay/);
  assert.match(cssSource, /sheet/);
});
