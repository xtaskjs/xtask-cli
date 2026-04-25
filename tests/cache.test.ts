import test from "node:test";
import assert from "node:assert/strict";
import { cacheCommand } from "../src/commands/cache.js";

test("cache models hits the default management endpoint", async () => {
  const restore = mockFetch({ ok: true, body: [{ name: "sessions", keyCount: 2 }] });
  const output = captureConsole("log");

  try {
    await cacheCommand().parseAsync(["models"], { from: "user" });

    assert.equal(lastFetchCall()?.url, "http://127.0.0.1:3000/ops/cache/models");
    assert.deepEqual(lastFetchCall()?.init, {
      method: "GET",
      headers: {
        accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      },
    });
    assert.match(output.messages.join("\n"), /"name": "sessions"/);
  } finally {
    output.restore();
    restore();
  }
});

test("cache entry encodes model and key segments", async () => {
  const restore = mockFetch({ ok: true, body: { hit: true, key: "user/42" } });
  const output = captureConsole("log");

  try {
    await cacheCommand().parseAsync(["entry", "session cache", "user/42"], { from: "user" });

    assert.equal(
      lastFetchCall()?.url,
      "http://127.0.0.1:3000/ops/cache/models/session%20cache/entries/user%2F42",
    );
  } finally {
    output.restore();
    restore();
  }
});

test("cache http-route forwards query parameters and custom connection options", async () => {
  const restore = mockFetch({ ok: true, body: { method: "GET", path: "/articles/landing" } });
  const output = captureConsole("log");

  try {
    await cacheCommand().parseAsync(
      [
        "http-route",
        "--method",
        "GET",
        "--path",
        "/articles/landing",
        "--server",
        "https://api.example.test/app",
        "--management-path",
        "internal/cache",
      ],
      { from: "user" },
    );

    assert.equal(
      lastFetchCall()?.url,
      "https://api.example.test/internal/cache/http/route?method=GET&path=%2Farticles%2Flanding",
    );
  } finally {
    output.restore();
    restore();
  }
});

test("cache clear-all uses DELETE against the controller root", async () => {
  const restore = mockFetch({ ok: true, body: [{ model: "sessions", removed: 3 }] });
  const output = captureConsole("log");

  try {
    await cacheCommand().parseAsync(["clear-all"], { from: "user" });

    assert.equal(lastFetchCall()?.url, "http://127.0.0.1:3000/ops/cache/");
    assert.equal(lastFetchCall()?.init?.method, "DELETE");
  } finally {
    output.restore();
    restore();
  }
});

test("cache commands surface response failures with server payload details", async () => {
  const restore = mockFetch({ ok: false, status: 404, statusText: "Not Found", body: { message: "Unknown model" } });
  const output = captureConsole("log");

  try {
    await assert.rejects(
      () => cacheCommand().parseAsync(["model", "missing"], { from: "user" }),
      /Cache request failed \(404 Not Found\): \{"message":"Unknown model"\}/,
    );
  } finally {
    output.restore();
    restore();
  }
});

type MockFetchResponse = {
  ok: boolean;
  body: unknown;
  status?: number;
  statusText?: string;
  contentType?: string;
};

const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

function lastFetchCall(): { url: string; init: RequestInit | undefined } | undefined {
  return fetchCalls.at(-1);
}

function mockFetch(response: MockFetchResponse): () => void {
  fetchCalls.length = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({ url, init });

    return new Response(JSON.stringify(response.body), {
      status: response.status ?? (response.ok ? 200 : 500),
      statusText: response.statusText ?? (response.ok ? "OK" : "Internal Server Error"),
      headers: {
        "content-type": response.contentType ?? "application/json",
      },
    });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function captureConsole(method: "log"): { messages: string[]; restore: () => void } {
  const original = console[method];
  const messages: string[] = [];

  console[method] = ((value?: unknown, ...rest: unknown[]) => {
    messages.push([value, ...rest].map((entry) => String(entry)).join(" "));
  }) as typeof console.log;

  return {
    messages,
    restore: () => {
      console[method] = original;
    },
  };
}