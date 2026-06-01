# xtaskjs Workspace

Workspace local con el paquete del CLI de XTaskJS en `packages/cli`, alineado con la organización actual del repositorio upstream basada en `pnpm` y `turbo`.

## Workspace Layout

- `packages/cli`: paquete publicable `@xtaskjs/cli`
- raíz: scripts compartidos de `turbo`, `eslint` y `vitest`

## CLI Features

- `create`: downloads `xtaskjs/typescript-starter` into a target directory
- `generate controller`: creates an XTaskJS controller skeleton
- `generate service`: creates an XTaskJS service skeleton
- `generate repository`: creates an XTaskJS repository skeleton
- `generate dto`: creates a validation DTO skeleton
- `generate guard`: creates an XTaskJS guard skeleton
- `generate middleware`: creates an XTaskJS middleware skeleton
- `generate module`: creates a feature scaffold with controller, service, repository, DTO, and barrel exports
- `generate resource`: creates controller, service, and repository files as a feature scaffold
- `generate gateway`: creates a Socket.IO gateway skeleton with common handlers
- `generate value-object`: creates a StringValueObject-based domain primitive
- `generate event-aggregate`: creates an event-sourced aggregate scaffold
- `generate event-subscriber`: creates an event-source subscriber scaffold
- `generate throttle-guard`: creates a ThrottlerService-backed guard scaffold
- `generate throttle-config`: creates a `configureThrottler(...)` bootstrap scaffold
- `cache`: talks to an app's XTaskJS cache management endpoints for inspection and clearing
- `add`: installs latest official `@xtaskjs/*` modules into an existing project

## Install

```bash
pnpm install
```

## Workspace Commands

```bash
pnpm build
pnpm test
pnpm lint
pnpm check
```

## Usage

Run the CLI package from source while developing:

```bash
pnpm --filter @xtaskjs/cli start -- --help
```

Build the workspace packages:

```bash
pnpm build
```

Run the automated CLI tests:

```bash
pnpm test
```

Install globally from npm:

```bash
pnpm add -g @xtaskjs/cli
xtask --help
```

Create a new XTaskJS project:

```bash
pnpm --filter @xtaskjs/cli start -- create my-api
```

Skip dependency installation during project creation:

```bash
pnpm --filter @xtaskjs/cli start -- create my-api --skip-install
```

Generate a controller inside an existing XTaskJS app:

```bash
pnpm --filter @xtaskjs/cli start -- generate controller users
```

Generate a resource trio:

```bash
pnpm --filter @xtaskjs/cli start -- generate resource billing
```

Generate a resource scaffold with a DTO file:

```bash
pnpm --filter @xtaskjs/cli start -- generate resource billing --with-dto
```

Generate a CRUD-oriented resource scaffold:

```bash
pnpm --filter @xtaskjs/cli start -- generate resource billing --crud
```

Write a resource scaffold directly into the target directory:

```bash
pnpm --filter @xtaskjs/cli start -- generate resource billing --path src/modules --flat
```

Generate a DTO for request validation:

```bash
pnpm --filter @xtaskjs/cli start -- generate dto create-user
```

Generate a guard or middleware:

```bash
pnpm --filter @xtaskjs/cli start -- generate guard admin-auth
pnpm --filter @xtaskjs/cli start -- generate middleware request-metrics
```

Generate a feature module folder:

```bash
pnpm --filter @xtaskjs/cli start -- generate module billing --path src/modules
```

Generate a Socket.IO gateway scaffold:

```bash
pnpm --filter @xtaskjs/cli start -- generate gateway chat
```

Generate a value object scaffold:

```bash
pnpm --filter @xtaskjs/cli start -- generate value-object email-address
```

Generate event-source aggregate and subscriber scaffolds:

```bash
pnpm --filter @xtaskjs/cli start -- generate event-aggregate users
pnpm --filter @xtaskjs/cli start -- generate event-subscriber users
```

Generate throttler guard and config scaffolds:

```bash
pnpm --filter @xtaskjs/cli start -- generate throttle-guard api
pnpm --filter @xtaskjs/cli start -- generate throttle-config api
```

Generate a module and wire a guard into its controller:

```bash
pnpm --filter @xtaskjs/cli start -- generate module billing --path src/modules --with-guard
```

Keep a module scaffold flat in the current target path:

```bash
pnpm --filter @xtaskjs/cli start -- generate module billing --path src/modules/billing --flat
```

Generate files in a different source directory:

```bash
pnpm --filter @xtaskjs/cli start -- generate service auth --path src/modules/auth
```

List registered cache models from a running XTaskJS app:

```bash
pnpm --filter @xtaskjs/cli start -- cache models
```

Inspect one cache model:

```bash
pnpm --filter @xtaskjs/cli start -- cache model products
```

Inspect a single cache entry:

```bash
pnpm --filter @xtaskjs/cli start -- cache entry products 42
```

Clear one model or all registered models:

```bash
pnpm --filter @xtaskjs/cli start -- cache clear products
pnpm --filter @xtaskjs/cli start -- cache clear-all
```

Inspect HTTP/browser cache metadata exposed by `createCacheManagementController()`:

```bash
pnpm --filter @xtaskjs/cli start -- cache http-routes
pnpm --filter @xtaskjs/cli start -- cache http-route --method GET --path /articles/landing
```

Target a different server or management controller path:

```bash
pnpm --filter @xtaskjs/cli start -- cache models --server http://127.0.0.1:4000 --management-path /internal/cache
```

Install one or more XTaskJS modules in the current project:

```bash
pnpm --filter @xtaskjs/cli start -- add cache queues socket-io
```

Install all currently published XTaskJS modules:

```bash
pnpm --filter @xtaskjs/cli start -- add --all
```

Use a different package manager for module installation:

```bash
pnpm --filter @xtaskjs/cli start -- add typeorm cqrs --package-manager pnpm
```

List the official modules with their latest published npm version:

```bash
pnpm --filter @xtaskjs/cli start -- add --list
```

List only selected modules and versions:

```bash
pnpm --filter @xtaskjs/cli start -- add --list core cache socket-io
```

## Troubleshooting

If you installed the package globally but `xtask` is not found, or the command does not appear to work, check the active Node environment first.

Useful commands:

```bash
node -v
pnpm root -g
pnpm list -g --depth=0 @xtaskjs/cli
type -a xtask
```

If you use `nvm`, global packages are installed separately for each Node version. That means `xtask` may be installed in one version but unavailable in the shell if another version is active.

Reinstall in the active Node version:

```bash
pnpm add -g @xtaskjs/cli
hash -r
xtask --help
```

If you want to verify the published package without relying on the global install, run:

```bash
pnpm dlx @xtaskjs/cli --help
```

## Notes

- The `create` command downloads the starter from `https://github.com/xtaskjs/typescript-starter`.
- Generated controller templates follow the decorator patterns used by XTaskJS samples and the official starter.
- `generate gateway` aligns with `@xtaskjs/socket-io` conventions from the official Socket.IO sample.
- `generate value-object` aligns with `@xtaskjs/value-objects` by creating a normalized `StringValueObject` scaffold.
- `generate event-aggregate` and `generate event-subscriber` provide starter files for `@xtaskjs/event-source` workflows.
- `generate throttle-guard` and `generate throttle-config` provide starter files for `@xtaskjs/throttler` integration.
- `resource` and `module` scaffolds create a dedicated feature directory by default; pass `--flat` to write files directly into the chosen path.
- `--with-guard` adds a `*.guard.ts` file and applies `@UseGuards(...)` to generated module/resource controllers.
- `--with-dto` adds a `*.dto.ts` file to a resource scaffold.
- `--crud` upgrades a resource scaffold to CRUD-style controller, service, and repository methods and also generates the DTO file.
- The `cache` command expects your app to opt into the XTaskJS management controller, typically with `createCacheManagementController({ path: "/ops/cache" })`.
- Generated DTOs assume the target app installs `class-validator` and, when needed, `class-transformer`, matching XTaskJS validation guidance.
- The `add` command resolves aliases like `cache` or `socket-io` to the official npm packages under the `@xtaskjs` scope and installs the latest published versions.
- The `add` command includes recently added official modules such as `@xtaskjs/throttler`.
- `add --list` queries the npm registry and prints the current published version for each official `@xtaskjs` module.