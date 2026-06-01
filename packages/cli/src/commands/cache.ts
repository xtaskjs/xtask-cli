import { Command, Option } from "commander";

interface CacheConnectionOptions {
  server?: string;
  managementPath?: string;
}

interface CacheRequestOptions extends Required<CacheConnectionOptions> {
  endpointPath: string;
  method?: "GET" | "DELETE";
  query?: Record<string, string>;
}

const DEFAULT_SERVER = "http://127.0.0.1:3000";
const DEFAULT_MANAGEMENT_PATH = "/ops/cache";

export function cacheCommand(): Command {
  const command = new Command("cache").description("Manage an XTaskJS app cache through its runtime admin endpoints");

  command.addCommand(
    withConnectionOptions(new Command("models").description("List registered cache models")).action(async (options) => {
      await executeRequest(options, {
        endpointPath: "/models",
      });
    }),
  );

  command.addCommand(
    withConnectionOptions(new Command("model").description("Inspect a cache model and its keys"))
      .argument("<model>", "Registered cache model name")
      .action(async (model: string, options) => {
        await executeRequest(options, {
          endpointPath: `/models/${encodeURIComponent(model)}`,
        });
      }),
  );

  command.addCommand(
    withConnectionOptions(new Command("entry").description("Inspect a single cache entry"))
      .argument("<model>", "Registered cache model name")
      .argument("<key>", "Cache entry key")
      .action(async (model: string, key: string, options) => {
        await executeRequest(options, {
          endpointPath: `/models/${encodeURIComponent(model)}/entries/${encodeURIComponent(key)}`,
        });
      }),
  );

  command.addCommand(
    withConnectionOptions(new Command("clear").description("Clear all entries from one cache model"))
      .argument("<model>", "Registered cache model name")
      .action(async (model: string, options) => {
        await executeRequest(options, {
          endpointPath: `/models/${encodeURIComponent(model)}`,
          method: "DELETE",
        });
      }),
  );

  command.addCommand(
    withConnectionOptions(new Command("delete").description("Delete one cache entry"))
      .argument("<model>", "Registered cache model name")
      .argument("<key>", "Cache entry key")
      .action(async (model: string, key: string, options) => {
        await executeRequest(options, {
          endpointPath: `/models/${encodeURIComponent(model)}/entries/${encodeURIComponent(key)}`,
          method: "DELETE",
        });
      }),
  );

  command.addCommand(
    withConnectionOptions(new Command("clear-all").description("Clear every registered cache model")).action(async (options) => {
      await executeRequest(options, {
        endpointPath: "/",
        method: "DELETE",
      });
    }),
  );

  command.addCommand(
    withConnectionOptions(new Command("http-routes").description("List routes with HTTP/browser cache policies")).action(
      async (options) => {
        await executeRequest(options, {
          endpointPath: "/http/routes",
        });
      },
    ),
  );

  command.addCommand(
    withConnectionOptions(new Command("http-route").description("Inspect the effective HTTP cache policy for one route"))
      .requiredOption("--method <method>", "HTTP method, for example GET")
      .requiredOption("--path <path>", "Application route path, for example /articles/landing")
      .action(async (options: CacheConnectionOptions & { method: string; path: string }) => {
        await executeRequest(options, {
          endpointPath: "/http/route",
          query: {
            method: options.method,
            path: options.path,
          },
        });
      }),
  );

  return command;
}

function withConnectionOptions(command: Command): Command {
  return command
    .addOption(new Option("--server <url>", "Base server URL").default(DEFAULT_SERVER))
    .addOption(new Option("--management-path <path>", "Cache management controller path").default(DEFAULT_MANAGEMENT_PATH));
}

async function executeRequest(connectionOptions: CacheConnectionOptions, request: Omit<CacheRequestOptions, "server" | "managementPath">): Promise<void> {
  const payload = await requestCacheEndpoint({
    server: connectionOptions.server ?? DEFAULT_SERVER,
    managementPath: connectionOptions.managementPath ?? DEFAULT_MANAGEMENT_PATH,
    ...request,
  });

  console.log(formatPayload(payload));
}

async function requestCacheEndpoint(options: CacheRequestOptions): Promise<unknown> {
  const url = buildCacheUrl(options);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    throw new Error(buildRequestError(response.status, response.statusText, payload));
  }

  return payload;
}

function buildCacheUrl(options: CacheRequestOptions): string {
  const url = new URL(normalizePath(options.managementPath), normalizeServer(options.server));
  url.pathname = joinUrlPath(url.pathname, options.endpointPath);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function normalizeServer(server: string): string {
  return server.endsWith("/") ? server : `${server}/`;
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed.length === 0) {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function joinUrlPath(basePath: string, endpointPath: string): string {
  const normalizedBase = normalizePath(basePath).replace(/\/$/, "");
  const normalizedEndpoint = endpointPath === "/" ? "" : normalizePath(endpointPath).replace(/\/$/, "");
  return `${normalizedBase}${normalizedEndpoint || "/"}`;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildRequestError(status: number, statusText: string, payload: unknown): string {
  const summary = `${status} ${statusText}`.trim();
  if (typeof payload === "string" && payload.length > 0) {
    return `Cache request failed (${summary}): ${payload}`;
  }

  if (payload && typeof payload === "object") {
    return `Cache request failed (${summary}): ${JSON.stringify(payload)}`;
  }

  return `Cache request failed (${summary})`;
}

function formatPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  return JSON.stringify(payload, null, 2);
}
