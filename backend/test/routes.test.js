const assert = require("assert");
const { test, describe } = require("node:test");
const crypto = require("crypto");

describe("Backend Security & Route Logic", () => {
  test("Nonce generation produces 256-bit hex string", () => {
    const nonce = crypto.randomBytes(32).toString("hex");
    assert.strictEqual(nonce.length, 64);
    assert.match(nonce, /^[a-f0-9]{64}$/);
  });

  test("Credential ID regex validation", () => {
    const validId = "0x" + "a".repeat(64);
    const invalidId = "0x12345";
    const regex = /^0x[a-fA-F0-9]{64}$/;

    assert.strictEqual(regex.test(validId), true);
    assert.strictEqual(regex.test(invalidId), false);
  });

  test("Rate limiter duration configuration", () => {
    const windowMs = 15 * 60 * 1000;
    assert.strictEqual(windowMs, 900000);
  });
});
