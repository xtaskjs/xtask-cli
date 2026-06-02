import { readFileSync } from "node:fs";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { cacheCommand } from "./commands/cache.js";
import { createCommand } from "./commands/create.js";
import { generateCommand } from "./commands/generate.js";

export function resolveCliVersion(): string {
  try {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const packageJsonContent = readFileSync(packageJsonUrl, "utf8");
    const packageJson = JSON.parse(packageJsonContent) as { version?: unknown };

    if (typeof packageJson.version === "string" && packageJson.version.trim().length > 0) {
      return packageJson.version.trim();
    }
  } catch {
    // Fall back to a safe placeholder when package.json is unavailable.
  }

  return "0.0.0";
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("xtask")
    .description("CLI for creating XTaskJS projects and generating common artifacts")
    .version(resolveCliVersion());

  program.addCommand(createCommand());
  program.addCommand(generateCommand());
  program.addCommand(cacheCommand());
  program.addCommand(addCommand());

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}