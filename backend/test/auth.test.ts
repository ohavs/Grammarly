import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./helpers.js";

test("register → login → me", async () => {
  const app = await buildApp();
  try {
    const email = `u${Date.now()}@t.com`;

    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, name: "Tester", password: "supersecret123" },
    });
    assert.equal(reg.statusCode, 200);
    const regBody = reg.json();
    assert.ok(regBody.token);
    assert.equal(regBody.user.email, email);

    const dupe = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, name: "Other", password: "anotherpass123" },
    });
    assert.equal(dupe.statusCode, 409);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "supersecret123" },
    });
    assert.equal(login.statusCode, 200);
    const token = login.json().token;

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().user.email, email);

    const meNoToken = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });
    assert.equal(meNoToken.statusCode, 401);
  } finally {
    await app.close();
  }
});

test("login rejects wrong password", async () => {
  const app = await buildApp();
  try {
    const email = `u${Date.now()}a@t.com`;
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, name: "X", password: "correctpass123" },
    });
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrongpass123" },
    });
    assert.equal(bad.statusCode, 401);
  } finally {
    await app.close();
  }
});
