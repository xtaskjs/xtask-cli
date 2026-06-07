import { test } from "vitest";
import assert from "node:assert/strict";
import { InvalidArgumentError } from "commander";
import {
  buildInstallArguments,
  formatModuleVersionTable,
  resolveLatestModuleVersions,
  resolveListModules,
  resolveModules,
} from "../src/commands/add.js";

test("resolveModules maps aliases and removes duplicates", () => {
  const modules = resolveModules(["cache", "@xtaskjs/cache", "socket-io"], false);
  assert.deepEqual(modules, ["@xtaskjs/cache", "@xtaskjs/socket-io"]);
});

test("resolveModules supports --all mode", () => {
  const modules = resolveModules([], true);
  assert.ok(modules.includes("@xtaskjs/bots"));
  assert.ok(modules.includes("@xtaskjs/config"));
  assert.ok(modules.includes("@xtaskjs/core"));
  assert.ok(modules.includes("@xtaskjs/mcp"));
  assert.ok(modules.includes("@xtaskjs/socket-io"));
  assert.ok(modules.includes("@xtaskjs/testing"));
  assert.ok(modules.includes("@xtaskjs/throttler"));
  assert.ok(modules.includes("@xtaskjs/validation"));
  assert.ok(modules.includes("@xtaskjs/value-objects"));
});

test("resolveModules fails for unknown module names", () => {
  assert.throws(() => resolveModules(["foo-bar"], false), InvalidArgumentError);
});

test("resolveListModules lists all modules by default", () => {
  const modules = resolveListModules([], false);
  assert.deepEqual(modules, [
    "@xtaskjs/common",
    "@xtaskjs/core",
    "@xtaskjs/config",
    "@xtaskjs/value-objects",
    "@xtaskjs/validation",
    "@xtaskjs/express-http",
    "@xtaskjs/fastify-http",
    "@xtaskjs/typeorm",
    "@xtaskjs/security",
    "@xtaskjs/mailer",
    "@xtaskjs/cache",
    "@xtaskjs/scheduler",
    "@xtaskjs/queues",
    "@xtaskjs/socket-io",
    "@xtaskjs/internationalization",
    "@xtaskjs/throttler",
    "@xtaskjs/testing",
    "@xtaskjs/cqrs",
    "@xtaskjs/event-source",
    "@xtaskjs/mcp",
    "@xtaskjs/bots",
  ]);
});

test("resolveListModules supports filtered module names", () => {
  const modules = resolveListModules(["core", "cache", "socket-io", "mcp", "bots"], false);
  assert.deepEqual(modules, ["@xtaskjs/core", "@xtaskjs/cache", "@xtaskjs/socket-io", "@xtaskjs/mcp", "@xtaskjs/bots"]);
});

test("buildInstallArguments uses npm install", () => {
  assert.deepEqual(buildInstallArguments("npm", ["@xtaskjs/core", "@xtaskjs/common"]), [
    "install",
    "@xtaskjs/core",
    "@xtaskjs/common",
  ]);
});

test("buildInstallArguments uses add for pnpm yarn and bun", () => {
  assert.deepEqual(buildInstallArguments("pnpm", ["@xtaskjs/cache"]), ["add", "@xtaskjs/cache"]);
  assert.deepEqual(buildInstallArguments("yarn", ["@xtaskjs/cache"]), ["add", "@xtaskjs/cache"]);
  assert.deepEqual(buildInstallArguments("bun", ["@xtaskjs/cache"]), ["add", "@xtaskjs/cache"]);
});

test("resolveLatestModuleVersions returns published versions", async () => {
  const fetchMock: typeof fetch = () => {
    return Promise.resolve(new Response(JSON.stringify({ version: "1.2.3" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  };

  const result = await resolveLatestModuleVersions(["@xtaskjs/core"], fetchMock);
  assert.deepEqual(result, [{ packageName: "@xtaskjs/core", version: "1.2.3" }]);
});

test("resolveLatestModuleVersions marks failures as unavailable", async () => {
  const fetchMock: typeof fetch = () => Promise.reject(new Error("network error"));

  const result = await resolveLatestModuleVersions(["@xtaskjs/core"], fetchMock);
  assert.deepEqual(result, [{ packageName: "@xtaskjs/core", version: "unavailable" }]);
});

test("formatModuleVersionTable prints a readable table", () => {
  const output = formatModuleVersionTable([
    { packageName: "@xtaskjs/core", version: "1.0.26" },
    { packageName: "@xtaskjs/socket-io", version: "1.0.1" },
  ]);

  assert.match(output, /module\s+version/);
  assert.match(output, /core\s+1\.0\.26/);
  assert.match(output, /socket-io\s+1\.0\.1/);
});