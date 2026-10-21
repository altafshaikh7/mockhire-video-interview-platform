import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "node:http";
import { io as socketClient } from "socket.io-client";
import app from "../src/app.js";
import { getAllowedOrigins, isAllowedOrigin } from "../src/config/origins.js";
import { cookieOptions } from "../src/middleware/auth.js";
import { attachSocket } from "../src/socket/index.js";

const productionOrigin = "https://mockhire-video-interview-platform.vercel.app";
const originalClientOrigin = process.env.CLIENT_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;
let server;
let baseUrl;

describe("separate frontend/backend deployment", () => {
  before(async () => {
    process.env.CLIENT_ORIGIN = productionOrigin;
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalClientOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = originalClientOrigin;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("allows the configured production origin and explicit localhost origins only", () => {
    assert.deepEqual(getAllowedOrigins(), [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      productionOrigin,
    ]);
    assert.equal(isAllowedOrigin(productionOrigin), true);
    assert.equal(isAllowedOrigin("http://localhost:5173"), true);
    assert.equal(isAllowedOrigin("https://attacker.example"), false);
  });

  it("returns credentialed CORS headers for production preflight", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: productionOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-debug-request-id",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), productionOrigin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.match(response.headers.get("access-control-allow-headers"), /content-type/i);
  });

  it("rejects state-changing requests from untrusted origins", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test@example.com", password: "not-a-real-password" }),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: "Origin not allowed" });
  });

  it("applies the same origin allowlist to Socket.IO handshakes", async () => {
    const socketServer = createServer();
    const io = attachSocket(socketServer);
    await new Promise((resolve) => socketServer.listen(0, "127.0.0.1", resolve));
    const socketUrl = `http://127.0.0.1:${socketServer.address().port}`;

    async function connectError(origin) {
      const client = socketClient(socketUrl, {
        transports: ["websocket"],
        extraHeaders: { Origin: origin },
        reconnection: false,
        timeout: 2000,
      });
      const result = await new Promise((resolve) => {
        client.once("connect", () => resolve("connected"));
        client.once("connect_error", (error) => resolve(error.message));
      });
      client.disconnect();
      return result;
    }

    try {
      assert.equal(await connectError(productionOrigin), "unauthorized");
      assert.notEqual(await connectError("https://attacker.example"), "unauthorized");
    } finally {
      await new Promise((resolve) => io.close(resolve));
    }
  });

  it("sets cross-site production cookies securely and keeps local development cookies", () => {
    process.env.NODE_ENV = "production";
    assert.deepEqual(cookieOptions(), {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    process.env.NODE_ENV = "development";
    assert.deepEqual(cookieOptions(), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });
  });
});
