import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./helpers.js";

async function registerUser(app: any, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, name: "T", password: "secret12345" },
  });
  return res.json().token as string;
}

test("documents are isolated per user", async () => {
  const app = await buildApp();
  try {
    const tokenA = await registerUser(app, `a${Date.now()}@t.com`);
    const tokenB = await registerUser(app, `b${Date.now()}@t.com`);

    const created = await app.inject({
      method: "POST",
      url: "/api/documents",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: "A doc", content: "Hello" },
    });
    assert.equal(created.statusCode, 200);
    const doc = created.json().document;

    const listA = await app.inject({
      method: "GET",
      url: "/api/documents",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(listA.json().documents.length, 1);

    const listB = await app.inject({
      method: "GET",
      url: "/api/documents",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(listB.json().documents.length, 0);

    const getB = await app.inject({
      method: "GET",
      url: `/api/documents/${doc.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(getB.statusCode, 404);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/documents/${doc.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { content: "Updated" },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().document.content, "Updated");
  } finally {
    await app.close();
  }
});
