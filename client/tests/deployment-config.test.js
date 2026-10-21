import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_BASE_URL, apiUrl } from "../src/lib/config.js";

describe("frontend deployment configuration", () => {
  it("keeps same-origin API paths when no production URL is configured", () => {
    assert.equal(API_BASE_URL, "");
    assert.equal(apiUrl("/api/auth/me"), "/api/auth/me");
  });

  it("normalizes API paths with or without a leading slash", () => {
    assert.equal(apiUrl("api/auth/me"), "/api/auth/me");
  });
});
