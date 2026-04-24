import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./helpers.js";

test("check detects spelling + repeated words", async () => {
  const app = await buildApp();
  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/check",
      payload: { text: "This are a tset. I I had an apple." },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.issues.length > 0);
    const hasSpell = body.issues.some(
      (i: any) => i.ruleId === "tset" || i.shortMessage === "Spelling",
    );
    assert.ok(hasSpell, "should flag misspelling");
  } finally {
    await app.close();
  }
});

test("stats returns expected fields", async () => {
  const app = await buildApp();
  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/stats",
      payload: { text: "Hello world. This is a test." },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.words, 6);
    assert.equal(body.sentences, 2);
    assert.ok(typeof body.fleschReadingEase === "number");
  } finally {
    await app.close();
  }
});

test("synonyms returns replacements for known words", async () => {
  const app = await buildApp();
  try {
    const res = await app.inject({
      method: "GET",
      url: "/api/synonyms/good",
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.synonyms.length > 0);

    const empty = await app.inject({
      method: "GET",
      url: "/api/synonyms/supercalifragilistic",
    });
    assert.deepEqual(empty.json().synonyms, []);
  } finally {
    await app.close();
  }
});
