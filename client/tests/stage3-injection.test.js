import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

// Mock globals for rtc.js and api.js
global.RTCPeerConnection = class RTCPeerConnection {
  constructor(config) {
    this.config = config;
  }
  addTrack() {}
  addTransceiver() {}
  getTransceivers() { return []; }
  close() {}
};

global.MediaStream = class MediaStream {
  getTracks() { return []; }
  getAudioTracks() { return []; }
  getVideoTracks() { return []; }
};

let lastFetchUrl = null;
let lastFetchOpts = null;
let mockFetchResponse = null;
let fetchCallCount = 0;

global.fetch = async (url, opts) => {
  fetchCallCount += 1;
  lastFetchUrl = url;
  lastFetchOpts = opts;
  if (mockFetchResponse instanceof Error) throw mockFetchResponse;
  return {
    ok: mockFetchResponse.ok ?? true,
    status: mockFetchResponse.status ?? 200,
    json: async () => mockFetchResponse.data
  };
};

import { createPeer } from "../src/lib/rtc.js";
import { api } from "../src/lib/api.js";

describe("Stage 3: Dynamic ICE Configuration Injection", () => {
  beforeEach(() => {
    lastFetchUrl = null;
    lastFetchOpts = null;
    mockFetchResponse = null;
    fetchCallCount = 0;
  });

  describe("API integration", () => {
    it("getIceServers formats the URL with roomCode correctly", async () => {
      mockFetchResponse = { data: { iceServers: [] } };
      await api.getIceServers("ROOM_123");
      assert.strictEqual(lastFetchUrl, "/api/webrtc/ice-servers?roomCode=ROOM_123");
      assert.strictEqual(lastFetchOpts.method, "GET");
      assert.strictEqual(lastFetchOpts.credentials, "include"); // existing auth intact
    });

    it("getIceServers handles empty roomCode gracefully", async () => {
      mockFetchResponse = { data: { iceServers: [] } };
      await api.getIceServers();
      assert.strictEqual(lastFetchUrl, "/api/webrtc/ice-servers");
    });

    it("coalesces concurrent session checks but does not cache completed responses", async () => {
      mockFetchResponse = { data: { user: { id: "user-1" } } };

      const [first, second] = await Promise.all([api.me(), api.me()]);
      assert.deepStrictEqual(first, second);
      assert.strictEqual(fetchCallCount, 1);

      await api.me();
      assert.strictEqual(fetchCallCount, 2);
    });

    it("coalesces matching interview lists without sharing different queries", async () => {
      mockFetchResponse = { data: { interviews: [] } };

      const [first, second] = await Promise.all([
        api.listInterviews({ page: 1, limit: 10 }),
        api.listInterviews({ page: 1, limit: 10 }),
      ]);
      assert.deepStrictEqual(first, second);
      assert.strictEqual(fetchCallCount, 1);

      await api.listInterviews({ page: 2, limit: 10 });
      assert.strictEqual(fetchCallCount, 2);
      assert.strictEqual(lastFetchUrl, "/api/interviews?page=2&limit=10");
    });
  });

  describe("RTC peer creation", () => {
    it("injects STUN-only configuration correctly", () => {
      const stunOnly = [{ urls: "stun:stun.l.google.com:19302" }];
      const stream = new global.MediaStream();
      const peer = createPeer({ iceServers: stunOnly, polite: true, localStream: stream });
      
      assert.deepStrictEqual(peer.pc.config.iceServers, stunOnly, "RTCPeerConnection must receive the exact runtime iceServers configuration");
    });

    it("injects STUN + TURN configuration correctly", () => {
      const stunTurn = [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: [
            "turn:turn.cloudflare.com:3478?transport=udp",
            "turns:turn.cloudflare.com:443?transport=tcp"
          ],
          username: "user123",
          credential: "password123"
        }
      ];
      const stream = new global.MediaStream();
      const peer = createPeer({ iceServers: stunTurn, polite: true, localStream: stream });
      
      assert.deepStrictEqual(peer.pc.config.iceServers, stunTurn, "RTCPeerConnection must receive the dynamic TURN credentials");
    });

    it("maintains all existing Perfect Negotiation properties (polite/impolite unmodified)", () => {
      const stream = new global.MediaStream();
      const politePeer = createPeer({ iceServers: [], polite: true, localStream: stream });
      const impolitePeer = createPeer({ iceServers: [], polite: false, localStream: stream });
      
      // We can't fully run WebRTC in Node, but we assert the returned object
      // contains the exact same methods, confirming the contract didn't change.
      assert.ok(typeof politePeer.handleSignal === "function");
      assert.ok(typeof impolitePeer.handleSignal === "function");
      assert.ok(typeof politePeer.shareScreen === "function");
      assert.ok(typeof politePeer.destroy === "function");
    });
  });
});
