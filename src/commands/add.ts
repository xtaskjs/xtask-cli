import { Command, InvalidArgumentError } from "commander";
import { runCommand } from "../utils/process.js";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const xtaskModules = [
  "@xtaskjs/common",
  "@xtaskjs/core",
  "@xtaskjs/cache",
  "@xtaskjs/cqrs",
  "@xtaskjs/event-source",
  "@xtaskjs/express-http",
  "@xtaskjs/fastify-http",
  "@xtaskjs/internationalization",
  "@xtaskjs/mailer",
  "@xtaskjs/queues",
  "@xtaskjs/scheduler",
  "@xtaskjs/security",
  "@xtaskjs/socket-io",
  "@xtaskjs/typeorm",
  "@xtaskjs/value-objects",
] as const;

const moduleAliasToPackage = new Map<string, string>(
  xtaskModules
    .flatMap((moduleName) => {
      const shortName = moduleName.replace("@xtaskjs/", "");
      return [
        [moduleName.toLowerCase(), moduleName],
        [shortName.toLowerCase(), moduleName],
      ] as const;
    }),
);

interface AddOptions {
  all?: boolean;
  list?: boolean;
  packageManager?: PackageManager;
}

export function addCommand(): Command {
  return new Command("add")
    .description("Install latest @xtaskjs modules into the current project")
    .argument("[modules...]", "Module names (for example: cache queues socket-io)")
    .option("--all", "Install all official @xtaskjs modules", false)
    .option("--list", "List official @xtaskjs modules with latest published versions", false)
    .option(
      "--package-manager <manager>",
      "Package manager used to install modules (npm, pnpm, yarn, bun)",
      "npm",
    )
    .action(async (rawModules: string[], options: AddOptions) => {
      if (options.list) {
        const modules = resolveListModules(rawModules, Boolean(options.all));
        const versions = await resolveLatestModuleVersions(modules);
        console.log(formatModuleVersionTable(versions));
        return;
      }

      const packageManager = parsePackageManager(options.packageManager ?? "npm");
      const modules = resolveModules(rawModules, Boolean(options.all));
      const args = buildInstallArguments(packageManager, modules);

      await runCommand(packageManager, args, { cwd: process.cwd() });
      console.log(`Installed modules: ${modules.join(", ")}`);
    });
}

export function resolveListModules(rawModules: string[], includeAll: boolean): string[] {
  if (includeAll || rawModules.length === 0) {
    return [...xtaskModules];
  }

  return resolveModules(rawModules, false);
}

export function resolveModules(rawModules: string[], installAll: boolean): string[] {
  if (installAll) {
    return [...xtaskModules];
  }

  if (!rawModules.length) {
    throw new InvalidArgumentError(
      "No modules provided. Pass one or more modules or use --all. Available modules: " +
        xtaskModules.map((name) => name.replace("@xtaskjs/", "")).join(", "),
    );
  }

  const resolved = rawModules.map((rawModule) => {
    const moduleName = rawModule.trim().toLowerCase();
    const packageName = moduleAliasToPackage.get(moduleName);
    if (!packageName || packageName === "all") {
      throw new InvalidArgumentError(
        `Unknown module '${rawModule}'. Available modules: ${xtaskModules
          .map((name) => name.replace("@xtaskjs/", ""))
          .join(", ")}`,
      );
    }

    return packageName;
  });

  return Array.from(new Set(resolved));
}

export function buildInstallArguments(manager: PackageManager, modules: string[]): string[] {
  switch (manager) {
    case "npm":
      return ["install", ...modules];
    case "pnpm":
      return ["add", ...modules];
    case "yarn":
      return ["add", ...modules];
    case "bun":
      return ["add", ...modules];
  }
}

export interface ModuleVersionInfo {
  packageName: string;
  version: string;
}

export async function resolveLatestModuleVersions(
  modules: string[],
  fetchFn: typeof fetch = fetch,
): Promise<ModuleVersionInfo[]> {
  return Promise.all(
    modules.map(async (packageName) => {
      const encodedName = encodeURIComponent(packageName);
      const endpoint = `https://registry.npmjs.org/${encodedName}/latest`;

      try {
        const response = await fetchFn(endpoint, {
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          return { packageName, version: "unavailable" };
        }

        const payload = (await response.json()) as { version?: unknown };
        const version = typeof payload.version === "string" && payload.version.trim().length > 0
          ? payload.version.trim()
          : "unavailable";

        return { packageName, version };
      } catch {
        return { packageName, version: "unavailable" };
      }
    }),
  );
}

export function formatModuleVersionTable(entries: ModuleVersionInfo[]): string {
  const normalizedRows = entries.map((entry) => ({
    moduleName: entry.packageName.replace("@xtaskjs/", ""),
    version: entry.version,
  }));
  const nameWidth = Math.max("module".length, ...normalizedRows.map((row) => row.moduleName.length));

  const lines = [
    `module${" ".repeat(nameWidth - "module".length)}  version`,
    `${"-".repeat(nameWidth)}  -------`,
    ...normalizedRows.map((row) => `${row.moduleName.padEnd(nameWidth)}  ${row.version}`),
  ];

  return lines.join("\n");
}

function parsePackageManager(value: string): PackageManager {
  const normalized = value.trim().toLowerCase();
  if (normalized === "npm" || normalized === "pnpm" || normalized === "yarn" || normalized === "bun") {
    return normalized;
  }

  throw new InvalidArgumentError("Unsupported package manager. Use one of: npm, pnpm, yarn, bun.");
}