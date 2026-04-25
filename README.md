# xtask-cli

Console client for bootstrapping XTaskJS applications from the official TypeScript starter and generating common source artifacts such as controllers, services, repositories, DTOs, guards, middleware, feature modules, and full resources.

## Features

- `create`: downloads `xtaskjs/typescript-starter` into a target directory
- `generate controller`: creates an XTaskJS controller skeleton
- `generate service`: creates an XTaskJS service skeleton
- `generate repository`: creates an XTaskJS repository skeleton
- `generate dto`: creates a validation DTO skeleton
- `generate guard`: creates an XTaskJS guard skeleton
- `generate middleware`: creates an XTaskJS middleware skeleton
- `generate module`: creates a feature scaffold with controller, service, repository, DTO, and barrel exports
- `generate resource`: creates controller, service, and repository files as a feature scaffold
- `cache`: talks to an app's XTaskJS cache management endpoints for inspection and clearing
- `add`: installs latest official `@xtaskjs/*` modules into an existing project

## Install

```bash
npm install
```

## Usage

Run from source while developing:

```bash
npm run start -- --help
```

Build the CLI:

```bash
npm run build
```

Run the automated generator tests:

```bash
npm test
```

Install globally from npm:

```bash
npm install -g @xtaskjs/cli
xtask --help
```

Create a new XTaskJS project:

```bash
npm run start -- create my-api
```

Skip dependency installation during project creation:

```bash
npm run start -- create my-api --skip-install
```

Generate a controller inside an existing XTaskJS app:

```bash
npm run start -- generate controller users
```

Generate a resource trio:

```bash
npm run start -- generate resource billing
```

Generate a resource scaffold with a DTO file:

```bash
npm run start -- generate resource billing --with-dto
```

Generate a CRUD-oriented resource scaffold:

```bash
npm run start -- generate resource billing --crud
```

Write a resource scaffold directly into the target directory:

```bash
npm run start -- generate resource billing --path src/modules --flat
```

Generate a DTO for request validation:

```bash
npm run start -- generate dto create-user
```

Generate a guard or middleware:

```bash
npm run start -- generate guard admin-auth
npm run start -- generate middleware request-metrics
```

Generate a feature module folder:

```bash
npm run start -- generate module billing --path src/modules
```

Generate a module and wire a guard into its controller:

```bash
npm run start -- generate module billing --path src/modules --with-guard
```

Keep a module scaffold flat in the current target path:

```bash
npm run start -- generate module billing --path src/modules/billing --flat
```

Generate files in a different source directory:

```bash
npm run start -- generate service auth --path src/modules/auth
```

List registered cache models from a running XTaskJS app:

```bash
npm run start -- cache models
```

Inspect one cache model:

```bash
npm run start -- cache model products
```

Inspect a single cache entry:

```bash
npm run start -- cache entry products 42
```

Clear one model or all registered models:

```bash
npm run start -- cache clear products
npm run start -- cache clear-all
```

Inspect HTTP/browser cache metadata exposed by `createCacheManagementController()`:

```bash
npm run start -- cache http-routes
npm run start -- cache http-route --method GET --path /articles/landing
```

Target a different server or management controller path:

```bash
npm run start -- cache models --server http://127.0.0.1:4000 --management-path /internal/cache
```

Install one or more XTaskJS modules in the current project:

```bash
npm run start -- add cache queues socket-io
```

Install all currently published XTaskJS modules:

```bash
npm run start -- add --all
```

Use a different package manager for module installation:

```bash
npm run start -- add typeorm cqrs --package-manager pnpm
```

List the official modules with their latest published npm version:

```bash
npm run start -- add --list
```

List only selected modules and versions:

```bash
npm run start -- add --list core cache socket-io
```

## Troubleshooting

If you installed the package globally but `xtask` is not found, or the command does not appear to work, check the active Node environment first.

Useful commands:

```bash
node -v
npm prefix -g
npm list -g --depth=0 @xtaskjs/cli
type -a xtask
```

If you use `nvm`, global packages are installed separately for each Node version. That means `xtask` may be installed in one version but unavailable in the shell if another version is active.

Reinstall in the active Node version:

```bash
npm install -g @xtaskjs/cli
hash -r
xtask --help
```

If you want to verify the published package without relying on the global install, run:

```bash
npx @xtaskjs/cli --help
```

## Notes

- The `create` command downloads the starter from `https://github.com/xtaskjs/typescript-starter`.
- Generated controller templates follow the decorator patterns used by XTaskJS samples and the official starter.
- `resource` and `module` scaffolds create a dedicated feature directory by default; pass `--flat` to write files directly into the chosen path.
- `--with-guard` adds a `*.guard.ts` file and applies `@UseGuards(...)` to generated module/resource controllers.
- `--with-dto` adds a `*.dto.ts` file to a resource scaffold.
- `--crud` upgrades a resource scaffold to CRUD-style controller, service, and repository methods and also generates the DTO file.
- The `cache` command expects your app to opt into the XTaskJS management controller, typically with `createCacheManagementController({ path: "/ops/cache" })`.
- Generated DTOs assume the target app installs `class-validator` and, when needed, `class-transformer`, matching XTaskJS validation guidance.
- The `add` command resolves aliases like `cache` or `socket-io` to the official npm packages under the `@xtaskjs` scope and installs the latest published versions.
- `add --list` queries the npm registry and prints the current published version for each official `@xtaskjs` module.