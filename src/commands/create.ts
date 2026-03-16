import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Command } from "commander";
import * as tar from "tar";
import { ensureEmptyDirectory, pathExists } from "../utils/filesystem.js";
import { runCommand } from "../utils/process.js";
import { toKebabCase, toTitleCase } from "../utils/naming.js";

const STARTER_ARCHIVE_URL = "https://codeload.github.com/xtaskjs/typescript-starter/tar.gz/refs/heads/main";

interface CreateOptions {
  force?: boolean;
  skipInstall?: boolean;
  packageManager?: string;
}

export function createCommand(): Command {
  return new Command("create")
    .description("Create a new XTaskJS project from the official TypeScript starter")
    .argument("<project-name>", "Project name used for the target package and default directory")
    .argument("[directory]", "Optional destination directory. Defaults to the project name")
    .option("-f, --force", "Allow using a non-empty destination directory", false)
    .option("--skip-install", "Do not run the package manager after downloading the starter", false)
    .option(
      "--package-manager <manager>",
      "Package manager used after scaffolding (npm, pnpm, yarn, bun)",
      "npm",
    )
    .action(async (projectName: string, directory: string | undefined, options: CreateOptions) => {
      const targetDirectory = resolve(process.cwd(), directory ?? projectName);
      const packageName = toKebabCase(projectName);
      const displayName = toTitleCase(projectName);

      await ensureEmptyDirectory(targetDirectory, Boolean(options.force));
      await downloadStarter(targetDirectory);
      await customizeStarter(targetDirectory, packageName, displayName);

      if (!options.skipInstall) {
        const manager = options.packageManager ?? "npm";
        await runCommand(manager, installArgumentsFor(manager), { cwd: targetDirectory });
      }

      const nextCommand = options.skipInstall
        ? `${options.packageManager ?? "npm"} install`
        : `${options.packageManager ?? "npm"} start`;

      console.log(`Created XTaskJS project in ${targetDirectory}`);
      console.log(`Next: cd ${targetDirectory} && ${nextCommand}`);
    });
}

async function downloadStarter(targetDirectory: string): Promise<void> {
  await mkdir(targetDirectory, { recursive: true });

  const response = await fetch(STARTER_ARCHIVE_URL, {
    headers: {
      "User-Agent": "xtask-cli",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download starter project (${response.status} ${response.statusText})`);
  }

  await pipeline(
    Readable.fromWeb(response.body as any),
    tar.x({
      cwd: targetDirectory,
      strip: 1,
    }),
  );
}

async function customizeStarter(
  targetDirectory: string,
  packageName: string,
  displayName: string,
): Promise<void> {
  const packageJsonPath = resolve(targetDirectory, "package.json");
  if (await pathExists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, unknown>;
    packageJson.name = packageName;
    await writeJson(packageJsonPath, packageJson);
  }

  const appConfigPath = resolve(targetDirectory, "src/app.config.ts");
  if (await pathExists(appConfigPath)) {
    const appConfigSource = await readFile(appConfigPath, "utf8");
    const updatedSource = appConfigSource
      .replace(/name:\s*"[^"]+"/, `name: ${JSON.stringify(displayName)}`)
      .replace(
        /description:\s*"[^"]+"/,
        `description: ${JSON.stringify(`Generated from xtaskjs/typescript-starter for ${displayName}.`)}`,
      );

    if (updatedSource !== appConfigSource) {
      await mkdir(dirname(appConfigPath), { recursive: true });
      await writeFile(appConfigPath, updatedSource, "utf8");
    }
  }
}

function installArgumentsFor(manager: string): string[] {
  switch (manager) {
    case "npm":
    case "pnpm":
    case "bun":
      return ["install"];
    case "yarn":
      return ["install"];
    default:
      throw new Error(`Unsupported package manager: ${manager}`);
  }
}

async function writeJson(filePath: string, payload: Record<string, unknown>): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}