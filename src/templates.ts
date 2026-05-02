import type { NameTokens } from "./utils/naming.js";

export const generatorKinds = [
  "controller",
  "service",
  "repository",
  "resource",
  "dto",
  "guard",
  "middleware",
  "module",
  "gateway",
  "value-object",
  "event-aggregate",
  "event-subscriber",
  "throttle-guard",
  "throttle-config",
] as const;

export type GeneratorKind = (typeof generatorKinds)[number];

export function renderControllerTemplate(
  tokens: NameTokens,
  options: { injectService?: boolean; useGuard?: boolean } = {},
): string {
  const serviceImport = options.injectService
    ? `import { ${tokens.pascalName}Service } from "./${tokens.kebabName}.service";\n`
    : "";
  const guardImport = options.useGuard
    ? `import { ${tokens.camelName}Guard } from "./${tokens.kebabName}.guard";\n`
    : "";

  const constructor = options.injectService
    ? `  constructor(\n    private readonly logger: Logger,\n    private readonly ${tokens.camelName}Service: ${tokens.pascalName}Service,\n  ) {}\n`
    : `  constructor(private readonly logger: Logger) {}\n`;

  const body = options.injectService
    ? `    return {\n      resource: ${JSON.stringify(tokens.kebabName)},\n      items: this.${tokens.camelName}Service.findAll(),\n    };`
    : `    return {\n      resource: ${JSON.stringify(tokens.kebabName)},\n      status: "ok",\n      timestamp: new Date().toISOString(),\n    };`;

  const controllerDecorators = options.useGuard
    ? `@Controller(${JSON.stringify(tokens.routePath)})\n@UseGuards(${tokens.camelName}Guard)`
    : `@Controller(${JSON.stringify(tokens.routePath)})`;

  const commonImports = options.useGuard
    ? "Controller, Get, Logger, UseGuards"
    : "Controller, Get, Logger";

  return `import { ${commonImports} } from "@xtaskjs/common";\n${serviceImport}${guardImport}\n${controllerDecorators}\nexport class ${tokens.pascalName}Controller {\n${constructor}\n  @Get("/")\n  index() {\n    this.logger.info(${JSON.stringify(`${tokens.pascalName} endpoint called`)});\n${body}\n  }\n}\n`;
}

export function renderCrudControllerTemplate(
  tokens: NameTokens,
  options: { useGuard?: boolean } = {},
): string {
  const guardImport = options.useGuard
    ? `import { ${tokens.camelName}Guard } from "./${tokens.kebabName}.guard";\n`
    : "";
  const commonImports = options.useGuard
    ? "Body, Controller, Delete, Get, Logger, Param, Patch, Post, UseGuards"
    : "Body, Controller, Delete, Get, Logger, Param, Patch, Post";
  const controllerDecorators = options.useGuard
    ? `@Controller(${JSON.stringify(tokens.routePath)})\n@UseGuards(${tokens.camelName}Guard)`
    : `@Controller(${JSON.stringify(tokens.routePath)})`;

  return `import { ${commonImports} } from "@xtaskjs/common";\nimport { ${tokens.pascalName}Dto } from "./${tokens.kebabName}.dto";\nimport { ${tokens.pascalName}Service } from "./${tokens.kebabName}.service";\n${guardImport}\n${controllerDecorators}\nexport class ${tokens.pascalName}Controller {\n  constructor(\n    private readonly logger: Logger,\n    private readonly ${tokens.camelName}Service: ${tokens.pascalName}Service,\n  ) {}\n\n  @Get("/")\n  list() {\n    this.logger.info(${JSON.stringify(`Listing ${tokens.kebabName}`)});\n    return this.${tokens.camelName}Service.findAll();\n  }\n\n  @Get("/:id")\n  getById(@Param("id") id: string) {\n    this.logger.info(${JSON.stringify(`Fetching ${tokens.kebabName} by id`)});\n    return this.${tokens.camelName}Service.findOne(id);\n  }\n\n  @Post("/")\n  create(@Body() body: ${tokens.pascalName}Dto) {\n    this.logger.info(${JSON.stringify(`Creating ${tokens.kebabName}`)});\n    return this.${tokens.camelName}Service.create(body);\n  }\n\n  @Patch("/:id")\n  update(@Param("id") id: string, @Body() body: ${tokens.pascalName}Dto) {\n    this.logger.info(${JSON.stringify(`Updating ${tokens.kebabName}`)});\n    return this.${tokens.camelName}Service.update(id, body);\n  }\n\n  @Delete("/:id")\n  remove(@Param("id") id: string) {\n    this.logger.info(${JSON.stringify(`Removing ${tokens.kebabName}`)});\n    return this.${tokens.camelName}Service.remove(id);\n  }\n}\n`;
}

export function renderServiceTemplate(
  tokens: NameTokens,
  options: { injectRepository?: boolean } = {},
): string {
  const repositoryImport = options.injectRepository
    ? `import { ${tokens.pascalName}Repository } from "./${tokens.kebabName}.repository";\n`
    : "";

  const constructor = options.injectRepository
    ? `  constructor(private readonly ${tokens.camelName}Repository: ${tokens.pascalName}Repository) {}\n\n`
    : "";

  const body = options.injectRepository
    ? `    return this.${tokens.camelName}Repository.findAll();`
    : "    return [];";

  return `import { Service } from "@xtaskjs/core";\n${repositoryImport}\n@Service({ scope: "singleton" })\nexport class ${tokens.pascalName}Service {\n${constructor}  findAll() {\n${body}\n  }\n}\n`;
}

export function renderCrudServiceTemplate(tokens: NameTokens): string {
  return `import { Service } from "@xtaskjs/core";\nimport { ${tokens.pascalName}Dto } from "./${tokens.kebabName}.dto";\nimport { ${tokens.pascalName}Repository } from "./${tokens.kebabName}.repository";\n\n@Service({ scope: "singleton" })\nexport class ${tokens.pascalName}Service {\n  constructor(private readonly ${tokens.camelName}Repository: ${tokens.pascalName}Repository) {}\n\n  findAll() {\n    return this.${tokens.camelName}Repository.findAll();\n  }\n\n  findOne(id: string) {\n    return this.${tokens.camelName}Repository.findById(id);\n  }\n\n  create(input: ${tokens.pascalName}Dto) {\n    return this.${tokens.camelName}Repository.create(input);\n  }\n\n  update(id: string, input: ${tokens.pascalName}Dto) {\n    return this.${tokens.camelName}Repository.update(id, input);\n  }\n\n  remove(id: string) {\n    return {\n      deleted: this.${tokens.camelName}Repository.remove(id),\n    };\n  }\n}\n`;
}

export function renderRepositoryTemplate(tokens: NameTokens): string {
  return `import { Repository } from "@xtaskjs/core";\n\n@Repository({ scope: "singleton" })\nexport class ${tokens.pascalName}Repository {\n  findAll() {\n    return [];\n  }\n}\n`;
}

export function renderCrudRepositoryTemplate(tokens: NameTokens): string {
  return `import { randomUUID } from "node:crypto";\nimport { Repository } from "@xtaskjs/core";\nimport { ${tokens.pascalName}Dto } from "./${tokens.kebabName}.dto";\n\nexport interface ${tokens.pascalName}Record extends ${tokens.pascalName}Dto {\n  id: string;\n  createdAt: string;\n  updatedAt: string;\n}\n\n@Repository({ scope: "singleton" })\nexport class ${tokens.pascalName}Repository {\n  private readonly items = new Map<string, ${tokens.pascalName}Record>();\n\n  findAll(): ${tokens.pascalName}Record[] {\n    return Array.from(this.items.values());\n  }\n\n  findById(id: string): ${tokens.pascalName}Record | undefined {\n    return this.items.get(id);\n  }\n\n  create(input: ${tokens.pascalName}Dto): ${tokens.pascalName}Record {\n    const timestamp = new Date().toISOString();\n    const item: ${tokens.pascalName}Record = {\n      id: randomUUID(),\n      ...input,\n      createdAt: timestamp,\n      updatedAt: timestamp,\n    };\n\n    this.items.set(item.id, item);\n    return item;\n  }\n\n  update(id: string, input: ${tokens.pascalName}Dto): ${tokens.pascalName}Record | undefined {\n    const existing = this.items.get(id);\n    if (!existing) {\n      return undefined;\n    }\n\n    const updated: ${tokens.pascalName}Record = {\n      ...existing,\n      ...input,\n      id,\n      updatedAt: new Date().toISOString(),\n    };\n\n    this.items.set(id, updated);\n    return updated;\n  }\n\n  remove(id: string): boolean {\n    return this.items.delete(id);\n  }\n}\n`;
}

export function renderDtoTemplate(tokens: NameTokens): string {
  return `import { IsOptional, IsString } from "class-validator";\n\nexport class ${tokens.pascalName}Dto {\n  @IsString()\n  name!: string;\n\n  @IsOptional()\n  @IsString()\n  description?: string;\n}\n`;
}

export function renderGuardTemplate(tokens: NameTokens): string {
  return `import { GuardLike, RouteExecutionContext } from "@xtaskjs/common";\n\nexport const ${tokens.camelName}Guard: GuardLike = {\n  canActivate(context: RouteExecutionContext) {\n    context.state.${tokens.camelName}Guard = true;\n    return true;\n  },\n};\n`;
}

export function renderMiddlewareTemplate(tokens: NameTokens): string {
  return `import { MiddlewareLike, RouteExecutionContext } from "@xtaskjs/common";\n\nexport const ${tokens.camelName}Middleware: MiddlewareLike = async (\n  context: RouteExecutionContext,\n  next: () => Promise<unknown>,\n) => {\n  context.state.${tokens.camelName}StartedAt = Date.now();\n  return next();\n};\n`;
}

export function renderModuleIndexTemplate(tokens: NameTokens, options: { withGuard?: boolean } = {}): string {
  const guardExport = options.withGuard ? `export * from "./${tokens.kebabName}.guard";\n` : "";

  return `export * from "./${tokens.kebabName}.controller";\nexport * from "./${tokens.kebabName}.service";\nexport * from "./${tokens.kebabName}.repository";\nexport * from "./${tokens.kebabName}.dto";\n${guardExport}`;
}

export function renderGatewayTemplate(tokens: NameTokens): string {
  return `import { Service } from "@xtaskjs/core";
import {
  OnSocketConnection,
  OnSocketDisconnect,
  OnSocketEvent,
  SocketGateway,
} from "@xtaskjs/socket-io";

@Service()
@SocketGateway({ namespace: ${JSON.stringify(`/${tokens.kebabName}`)}, group: [${JSON.stringify(tokens.kebabName)}] })
export class ${tokens.pascalName}Gateway {
  @OnSocketConnection()
  onConnect(socket: { id: string }) {
    return {
      connected: true,
      socketId: socket.id,
      namespace: ${JSON.stringify(`/${tokens.kebabName}`)},
    };
  }

  @OnSocketEvent("ping")
  onPing(payload: { message?: string }, context: { socket: { id: string } }) {
    return {
      event: "pong",
      message: payload?.message ?? "pong",
      socketId: context.socket.id,
    };
  }

  @OnSocketDisconnect()
  onDisconnect(reason: string) {
    return {
      disconnected: true,
      reason,
    };
  }
}
`;
}

export function renderValueObjectTemplate(tokens: NameTokens): string {
  return `import { StringValueObject } from "@xtaskjs/value-objects";

export class ${tokens.pascalName} extends StringValueObject {
  constructor(value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new Error(${JSON.stringify(`${tokens.pascalName} cannot be empty`)});
    }

    super(normalized);
  }
}
`;
}

export function renderEventAggregateTemplate(tokens: NameTokens): string {
  return `import {
  ApplyEvent,
  EventSourcedAggregate,
  EventSourcedAggregateRoot,
} from "@xtaskjs/event-source";

export class ${tokens.pascalName}CreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

@EventSourcedAggregate({ stream: ${JSON.stringify(tokens.kebabName)} })
export class ${tokens.pascalName}Aggregate extends EventSourcedAggregateRoot {
  public name?: string;

  create(id: string, name: string) {
    this.assignStreamId(id);
    this.raiseEvent(new ${tokens.pascalName}CreatedEvent(id, name));
  }

  @ApplyEvent(${tokens.pascalName}CreatedEvent)
  onCreated(event: ${tokens.pascalName}CreatedEvent) {
    this.name = event.name;
  }
}
`;
}

export function renderEventSubscriberTemplate(tokens: NameTokens): string {
  return `import { Service } from "@xtaskjs/core";
import { EventSourceSubscriber, IEventSourceSubscriber } from "@xtaskjs/event-source";
import { ${tokens.pascalName}CreatedEvent } from "./${tokens.kebabName}.aggregate";

@Service()
@EventSourceSubscriber(${tokens.pascalName}CreatedEvent)
export class ${tokens.pascalName}Subscriber implements IEventSourceSubscriber<${tokens.pascalName}CreatedEvent> {
  handle(event: ${tokens.pascalName}CreatedEvent) {
    return {
      handled: true,
      id: event.id,
      name: event.name,
    };
  }
}
`;
}

export function renderThrottleGuardTemplate(tokens: NameTokens): string {
  return `import { GuardLike, RouteExecutionContext } from "@xtaskjs/common";
import { InjectThrottlerService, ThrottlerService } from "@xtaskjs/throttler";
import { Service } from "@xtaskjs/core";

@Service()
export class ${tokens.pascalName}ThrottleGuard implements GuardLike {
  constructor(
    @InjectThrottlerService()
    private readonly throttler: ThrottlerService,
  ) {}

  async canActivate(context: RouteExecutionContext) {
    const request = context.request as { ip?: string } | undefined;
    const key = [${JSON.stringify(tokens.kebabName)}, request?.ip || "unknown"].join(":");

    await this.throttler.consume(key, {
      limit: 10,
      ttl: "1m",
    });

    return true;
  }
}
`;
}

export function renderThrottleConfigTemplate(tokens: NameTokens): string {
  return `import { configureThrottler } from "@xtaskjs/throttler";

export function configure${tokens.pascalName}Throttler() {
  configureThrottler({
    limit: 5,
    ttl: "10s",
    driver: "memory",
    errorMessage: "Rate limit exceeded. Please retry later.",
  });
}
`;
}