import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateCommand } from "../src/commands/generate.js";

async function createSandbox(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `xtask-cli-${prefix}-`));
}

async function runGenerate(args: string[]): Promise<void> {
  await generateCommand().parseAsync(args, { from: "user" });
}

async function runGenerateWithLogs(args: string[]): Promise<string[]> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...messages: unknown[]) => {
    logs.push(messages.map((value) => String(value)).join(" "));
  };

  try {
    await runGenerate(args);
  } finally {
    console.log = originalLog;
  }

  return logs;
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
    /--with-dto is only supported for the resource generator\./,
  );

  await assert.rejects(
    () => runGenerate(["service", "billing", "--crud"]),
    /--crud is only supported for resource and controller-test generators\./,
  );

  await assert.rejects(
    () => runGenerate(["service", "auth", "--run"]),
    /--run is only supported for controller-test, service-test, and resource-tests generators\./,
  );
});

test("controller-test generator emits a skipped unit-test scaffold", async () => {
  const sandbox = await createSandbox("controller-test");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["controller-test", "users", "--path", sandbox]);

    const spec = await readUtf8(join(sandbox, "users.controller.spec.ts"));

    assert.match(spec, /describe\("UsersController"/);
    assert.match(spec, /test\.skip\("resolves service from the testing module"/);
    assert.match(spec, /providers:\s*\[\s*UsersController,/);
  });
});

test("controller-test supports --crud and emits CRUD-focused placeholder", async () => {
  const sandbox = await createSandbox("controller-test-crud");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["controller-test", "users", "--path", sandbox, "--crud"]);

    const spec = await readUtf8(join(sandbox, "users.controller.spec.ts"));

    assert.match(spec, /test\.skip\("validates CRUD controller contract/);
    assert.match(spec, /list\/getById\/create\/update\/remove/);
  });
});

test("controller-test supports --crud with --run and emits CRUD runnable test", async () => {
  const sandbox = await createSandbox("controller-test-crud-run");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["controller-test", "users", "--path", sandbox, "--crud", "--run"]);

    const spec = await readUtf8(join(sandbox, "users.controller.spec.ts"));

    assert.match(spec, /runs CRUD controller actions/);
    assert.match(spec, /expect\(controller\.list\(\)\)/);
    assert.match(spec, /expect\(controller\.getById\("1"\)\)/);
    assert.match(spec, /expect\(controller\.create\(\{ name: "new" \}\)\)/);
    assert.match(spec, /expect\(controller\.update\("1", \{ name: "updated" \}\)\)/);
    assert.match(spec, /expect\(controller\.remove\("1"\)\)/);
    assert.doesNotMatch(spec, /test\.skip\(/);
  });
});

test("controller-test auto-detects CRUD controllers without --crud", async () => {
  const sandbox = await createSandbox("controller-test-crud-auto");

  await usingSandbox(sandbox, async () => {
    await writeFile(
      join(sandbox, "users.controller.ts"),
      `export class UsersController {
  list() {
    return [];
  }

  getById(id: string) {
    return { id };
  }

  create(input: { name: string }) {
    return input;
  }

  update(id: string, input: { name: string }) {
    return { id, ...input };
  }

  remove(id: string) {
    return { deleted: Boolean(id) };
  }
}
`,
      "utf8",
    );

    await runGenerate(["controller-test", "users", "--path", sandbox, "--run"]);

    const spec = await readUtf8(join(sandbox, "users.controller.spec.ts"));

    assert.match(spec, /runs CRUD controller actions/);
    assert.match(spec, /expect\(controller\.list\(\)\)/);
    assert.match(spec, /expect\(controller\.getById\("1"\)\)/);
  });
});

test("controller-test prints informative mode message for CRUD autodetection", async () => {
  const sandbox = await createSandbox("controller-test-crud-log");

  await usingSandbox(sandbox, async () => {
    await writeFile(
      join(sandbox, "users.controller.ts"),
      `export class UsersController {
  list() { return []; }
  getById(id: string) { return { id }; }
  create(input: { name: string }) { return input; }
  update(id: string, input: { name: string }) { return { id, ...input }; }
  remove(id: string) { return { deleted: Boolean(id) }; }
}
`,
      "utf8",
    );

    const logs = await runGenerateWithLogs(["controller-test", "users", "--path", sandbox, "--run"]);

    assert.ok(logs.includes("Info: controller-test: CRUD detected"));
  });
});

test("controller-test degrades to simple scaffold when controller is not CRUD", async () => {
  const sandbox = await createSandbox("controller-test-non-crud-auto");

  await usingSandbox(sandbox, async () => {
    await writeFile(
      join(sandbox, "health.controller.ts"),
      `export class HealthController {
  index() {
    return { status: "ok" };
  }
}
`,
      "utf8",
    );

    await runGenerate(["controller-test", "health", "--path", sandbox, "--run"]);

    const spec = await readUtf8(join(sandbox, "health.controller.spec.ts"));

    assert.match(spec, /resolves controller from the testing module/);
    assert.doesNotMatch(spec, /runs CRUD controller actions/);
  });
});

test("controller-test prints informative mode message for simple fallback", async () => {
  const sandbox = await createSandbox("controller-test-simple-log");

  await usingSandbox(sandbox, async () => {
    const logs = await runGenerateWithLogs(["controller-test", "health", "--path", sandbox, "--run"]);
    assert.ok(logs.includes("Info: controller-test: fallback to simple"));
  });
});

test("controller-test --quiet suppresses informative mode message", async () => {
  const sandbox = await createSandbox("controller-test-quiet-log");

  await usingSandbox(sandbox, async () => {
    const logs = await runGenerateWithLogs(["controller-test", "health", "--path", sandbox, "--run", "--quiet"]);
    assert.ok(!logs.some((line) => line.startsWith("Info: controller-test:")));
    assert.ok(logs.some((line) => line.includes("Created")));
  });
});

test("service-test generator emits runnable test scaffold with --run", async () => {
  const sandbox = await createSandbox("service-test-run");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["service-test", "users", "--path", sandbox, "--run"]);

    const spec = await readUtf8(join(sandbox, "users.service.spec.ts"));

    assert.match(spec, /import \{ UsersRepository \} from "\.\/users\.repository";/);
    assert.match(spec, /const repositoryMock =/);
    assert.match(spec, /test\("resolves service from the testing module"/);
    assert.doesNotMatch(spec, /test\.skip\(/);
  });
});

test("resource-tests generator emits controller service and repository test files", async () => {
  const sandbox = await createSandbox("resource-tests");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["resource-tests", "billing", "--path", sandbox]);

    const controllerSpec = await readUtf8(join(sandbox, "billing.controller.spec.ts"));
    const serviceSpec = await readUtf8(join(sandbox, "billing.service.spec.ts"));
    const repositorySpec = await readUtf8(join(sandbox, "billing.repository.spec.ts"));

    assert.match(controllerSpec, /test\.skip\(/);
    assert.match(serviceSpec, /test\.skip\(/);
    assert.match(repositorySpec, /test\.skip\(/);
  });
});

test("resource-tests supports --run and emits runnable tests", async () => {
  const sandbox = await createSandbox("resource-tests-run");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["resource-tests", "users", "--path", sandbox, "--run"]);

    const controllerSpec = await readUtf8(join(sandbox, "users.controller.spec.ts"));
    const serviceSpec = await readUtf8(join(sandbox, "users.service.spec.ts"));
    const repositorySpec = await readUtf8(join(sandbox, "users.repository.spec.ts"));

    assert.match(controllerSpec, /test\("resolves controller from the testing module"/);
    assert.match(serviceSpec, /test\("resolves service from the testing module"/);
    assert.match(repositorySpec, /test\("resolves repository from the testing module"/);

    assert.doesNotMatch(controllerSpec, /test\.skip\(/);
    assert.doesNotMatch(serviceSpec, /test\.skip\(/);
    assert.doesNotMatch(repositorySpec, /test\.skip\(/);
  });
});

test("resource-tests auto-detects CRUD controller and emits CRUD controller test", async () => {
  const sandbox = await createSandbox("resource-tests-crud-auto");

  await usingSandbox(sandbox, async () => {
    await writeFile(
      join(sandbox, "users.controller.ts"),
      `export class UsersController {
  list() {
    return [];
  }

  getById(id: string) {
    return { id };
  }

  create(input: { name: string }) {
    return input;
  }

  update(id: string, input: { name: string }) {
    return { id, ...input };
  }

  remove(id: string) {
    return { deleted: Boolean(id) };
  }
}
`,
      "utf8",
    );

    await runGenerate(["resource-tests", "users", "--path", sandbox, "--run"]);

    const controllerSpec = await readUtf8(join(sandbox, "users.controller.spec.ts"));
    const serviceSpec = await readUtf8(join(sandbox, "users.service.spec.ts"));
    const repositorySpec = await readUtf8(join(sandbox, "users.repository.spec.ts"));

    assert.match(controllerSpec, /runs CRUD controller actions/);
    assert.match(controllerSpec, /expect\(controller\.list\(\)\)/);
    assert.match(serviceSpec, /test\("resolves service from the testing module"/);
    assert.match(repositorySpec, /test\("resolves repository from the testing module"/);
  });
});

test("resource-tests prints informative mode message for simple fallback", async () => {
  const sandbox = await createSandbox("resource-tests-simple-log");

  await usingSandbox(sandbox, async () => {
    const logs = await runGenerateWithLogs(["resource-tests", "health", "--path", sandbox, "--run"]);
    assert.ok(logs.includes("Info: resource-tests: fallback to simple"));
  });
});

test("resource-tests --quiet suppresses informative mode message", async () => {
  const sandbox = await createSandbox("resource-tests-quiet-log");

  await usingSandbox(sandbox, async () => {
    const logs = await runGenerateWithLogs(["resource-tests", "health", "--path", sandbox, "--run", "--quiet"]);
    assert.ok(!logs.some((line) => line.startsWith("Info: resource-tests:")));
    assert.ok(logs.some((line) => line.includes("Created")));
  });
});

test("resource-tests falls back to simple controller test when controller is not CRUD", async () => {
  const sandbox = await createSandbox("resource-tests-non-crud-auto");

  await usingSandbox(sandbox, async () => {
    await writeFile(
      join(sandbox, "health.controller.ts"),
      `export class HealthController {
  index() {
    return { status: "ok" };
  }
}
`,
      "utf8",
    );

    await runGenerate(["resource-tests", "health", "--path", sandbox, "--run"]);

    const controllerSpec = await readUtf8(join(sandbox, "health.controller.spec.ts"));

    assert.match(controllerSpec, /resolves controller from the testing module/);
    assert.doesNotMatch(controllerSpec, /runs CRUD controller actions/);
  });
});

test("gateway generator emits socket-io scaffold", async () => {
  const sandbox = await createSandbox("gateway");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["gateway", "chat", "--path", sandbox]);

    const gateway = await readUtf8(join(sandbox, "chat.gateway.ts"));

    assert.match(gateway, /@SocketGateway\(\{ namespace: "\/chat"/);
    assert.match(gateway, /@OnSocketConnection\(\)/);
    assert.match(gateway, /@OnSocketEvent\("ping"\)/);
    assert.match(gateway, /@OnSocketDisconnect\(\)/);
  });
});

test("value-object generator emits value object scaffold", async () => {
  const sandbox = await createSandbox("value-object");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["value-object", "email-address", "--path", sandbox]);

    const valueObject = await readUtf8(join(sandbox, "email-address.value-object.ts"));

    assert.match(valueObject, /extends StringValueObject/);
    assert.match(valueObject, /class EmailAddress/);
    assert.match(valueObject, /trim\(\)\.toLowerCase\(\)/);
  });
});

test("event-source generators emit aggregate and subscriber scaffolds", async () => {
  const sandbox = await createSandbox("event-source");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["event-aggregate", "users", "--path", sandbox]);
    await runGenerate(["event-subscriber", "users", "--path", sandbox]);

    const aggregate = await readUtf8(join(sandbox, "users.aggregate.ts"));
    const subscriber = await readUtf8(join(sandbox, "users.subscriber.ts"));

    assert.match(aggregate, /@EventSourcedAggregate\(\{ stream: "users" \}\)/);
    assert.match(aggregate, /class UsersAggregate extends EventSourcedAggregateRoot/);
    assert.match(aggregate, /@ApplyEvent\(UsersCreatedEvent\)/);

    assert.match(subscriber, /@EventSourceSubscriber\(UsersCreatedEvent\)/);
    assert.match(subscriber, /implements IEventSourceSubscriber<UsersCreatedEvent>/);
    assert.match(subscriber, /from "\.\/users\.aggregate"/);
  });
});

test("throttle-guard generator emits throttler guard scaffold", async () => {
  const sandbox = await createSandbox("throttle-guard");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["throttle-guard", "api", "--path", sandbox]);

    const guard = await readUtf8(join(sandbox, "api.throttle-guard.ts"));

    assert.match(guard, /class ApiThrottleGuard implements GuardLike/);
    assert.match(guard, /@InjectThrottlerService\(\)/);
    assert.match(guard, /this\.throttler\.consume\(key, \{/);
    assert.match(guard, /ttl: "1m"/);
  });
});

test("throttle-config generator emits configureThrottler scaffold", async () => {
  const sandbox = await createSandbox("throttle-config");

  await usingSandbox(sandbox, async () => {
    await runGenerate(["throttle-config", "api", "--path", sandbox]);

    const config = await readUtf8(join(sandbox, "api.throttle-config.ts"));

    assert.match(config, /configureApiThrottler\(\)/);
    assert.match(config, /configureThrottler\(\{/);
    assert.match(config, /limit: 5/);
    assert.match(config, /driver: "memory"/);
  });
});

async function usingSandbox<T>(sandbox: string, callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}