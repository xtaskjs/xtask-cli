import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";
import { createProgram } from "../src/program.js";

type PackageJson = {
  version?: unknown;
};

test("--version matches package.json version", async () => {
  const packageJsonContent = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const packageJson = JSON.parse(packageJsonContent) as PackageJson;

  assert.equal(typeof packageJson.version, "string");
  const expectedVersion = packageJson.version.trim();
  assert.ok(expectedVersion.length > 0);

  const stdout: string[] = [];
  const program = createProgram();
  program.exitOverride();
  program.configureOutput({
    writeOut: (line) => {
      stdout.push(line);
    },
    writeErr: () => {
      // No-op for this assertion.
    },
  });

  await assert.rejects(
    () => program.parseAsync(["node", "xtask", "--version"], { from: "user" }),
    (error: unknown) => {
      if (!(error instanceof Error) || !("code" in error)) {
        return false;
      }

      return error.code === "commander.version";
    },
  );

  const renderedVersion = stdout.join("").trim();
  assert.equal(renderedVersion, expectedVersion);
});