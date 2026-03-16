import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateCommand } from "../src/commands/generate.js";

async function createSandbox(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `xtask-cli-${prefix}-`));
}

async function runGenerate(args: string[]): Promise<void> {
  await generateCommand().parseAsync(args, { from: "user" });
}

async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("resource generator emits the default nested scaffold contents", async () => {
  const sandbox = await createSandbox("resource-default");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["resource", "users", "--path", sandbox]);

    const controller = await readUtf8(join(sandbox, "users", "users.controller.ts"));
    const service = await readUtf8(join(sandbox, "users", "users.service.ts"));
    const repository = await readUtf8(join(sandbox, "users", "users.repository.ts"));

    assert.equal(
      controller,
      `import { Controller, Get, Logger } from "@xtaskjs/common";
import { UsersService } from "./users.service";

@Controller("/users")
export class UsersController {
  constructor(
    private readonly logger: Logger,
    private readonly usersService: UsersService,
  ) {}

  @Get("/")
  index() {
    this.logger.info("Users endpoint called");
    return {
      resource: "users",
      items: this.usersService.findAll(),
    };
  }
}
`,
    );

    assert.equal(
      service,
      `import { Service } from "@xtaskjs/core";
import { UsersRepository } from "./users.repository";

@Service({ scope: "singleton" })
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.findAll();
  }
}
`,
    );

    assert.equal(
      repository,
      `import { Repository } from "@xtaskjs/core";

@Repository({ scope: "singleton" })
export class UsersRepository {
  findAll() {
    return [];
  }
}
`,
    );
  });
});

test("resource generator supports flat with-dto and with-guard presets", async () => {
  const sandbox = await createSandbox("resource-flat-dto-guard");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["resource", "audit", "--path", sandbox, "--flat", "--with-dto", "--with-guard"]);

    const controller = await readUtf8(join(sandbox, "audit.controller.ts"));
    const dto = await readUtf8(join(sandbox, "audit.dto.ts"));
    const guard = await readUtf8(join(sandbox, "audit.guard.ts"));

    assert.equal(
      controller,
      `import { Controller, Get, Logger, UseGuards } from "@xtaskjs/common";
import { AuditService } from "./audit.service";
import { auditGuard } from "./audit.guard";

@Controller("/audit")
@UseGuards(auditGuard)
export class AuditController {
  constructor(
    private readonly logger: Logger,
    private readonly auditService: AuditService,
  ) {}

  @Get("/")
  index() {
    this.logger.info("Audit endpoint called");
    return {
      resource: "audit",
      items: this.auditService.findAll(),
    };
  }
}
`,
    );

    assert.equal(
      dto,
      `import { IsOptional, IsString } from "class-validator";

export class AuditDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
`,
    );

    assert.equal(
      guard,
      `import { GuardLike, RouteExecutionContext } from "@xtaskjs/common";

export const auditGuard: GuardLike = {
  canActivate(context: RouteExecutionContext) {
    context.state.auditGuard = true;
    return true;
  },
};
`,
    );
  });
});

test("resource generator emits CRUD scaffold contents", async () => {
  const sandbox = await createSandbox("resource-crud");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["resource", "invoices", "--path", sandbox, "--crud", "--with-guard"]);

    const controller = await readUtf8(join(sandbox, "invoices", "invoices.controller.ts"));
    const service = await readUtf8(join(sandbox, "invoices", "invoices.service.ts"));
    const repository = await readUtf8(join(sandbox, "invoices", "invoices.repository.ts"));

    assert.match(controller, /@Get\("\/"\)[\s\S]*list\(\)/);
    assert.match(controller, /@Get\("\/:id"\)[\s\S]*getById/);
    assert.match(controller, /@Post\("\/"\)[\s\S]*create\(@Body\(\) body: InvoicesDto\)/);
    assert.match(controller, /@Patch\("\/:id"\)[\s\S]*update\(@Param\("id"\) id: string, @Body\(\) body: InvoicesDto\)/);
    assert.match(controller, /@Delete\("\/:id"\)[\s\S]*remove\(@Param\("id"\) id: string\)/);
    assert.match(controller, /@UseGuards\(invoicesGuard\)/);

    assert.match(service, /findOne\(id: string\)/);
    assert.match(service, /create\(input: InvoicesDto\)/);
    assert.match(service, /update\(id: string, input: InvoicesDto\)/);
    assert.match(service, /deleted: this\.invoicesRepository\.remove\(id\)/);

    assert.match(repository, /import \{ randomUUID \} from "node:crypto";/);
    assert.match(repository, /interface InvoicesRecord extends InvoicesDto/);
    assert.match(repository, /findById\(id: string\): InvoicesRecord \| undefined/);
    assert.match(repository, /id: randomUUID\(\)/);
    assert.match(repository, /remove\(id: string\): boolean/);
  });
});

test("module generator emits the default nested scaffold contents", async () => {
  const sandbox = await createSandbox("module-default");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["module", "billing", "--path", sandbox]);

    const index = await readUtf8(join(sandbox, "billing", "index.ts"));
    const dto = await readUtf8(join(sandbox, "billing", "billing.dto.ts"));

    assert.equal(
      index,
      `export * from "./billing.controller";
export * from "./billing.service";
export * from "./billing.repository";
export * from "./billing.dto";
`,
    );

    assert.equal(
      dto,
      `import { IsOptional, IsString } from "class-validator";

export class BillingDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
`,
    );
  });
});

test("module generator supports flat guarded scaffolds", async () => {
  const sandbox = await createSandbox("module-flat-guard");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["module", "reports", "--path", sandbox, "--flat", "--with-guard"]);

    const controller = await readUtf8(join(sandbox, "reports.controller.ts"));
    const index = await readUtf8(join(sandbox, "index.ts"));

    assert.match(controller, /import \{ reportsGuard \} from "\.\/reports\.guard";/);
    assert.match(controller, /@UseGuards\(reportsGuard\)/);
    assert.match(index, /export \* from "\.\/reports\.guard";/);
  });
});

test("resource-only presets are rejected for other generators", async () => {
  await assert.rejects(
    () => runGenerate(["service", "auth", "--with-dto"]),
    /--with-dto and --crud are only supported for the resource generator\./,
  );

  await assert.rejects(
    () => runGenerate(["module", "billing", "--crud"]),
    /--with-dto and --crud are only supported for the resource generator\./,
  );
});

async function usingSandbox<T>(sandbox: string, callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}