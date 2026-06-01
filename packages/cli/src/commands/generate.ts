import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command, InvalidArgumentError } from "commander";
import {
  renderControllerTestTemplate,
  renderEventAggregateTemplate,
  renderEventSubscriberTemplate,
  renderGatewayTemplate,
  generatorKinds,
  type GeneratorKind,
  renderControllerTemplate,
  renderCrudControllerTemplate,
  renderCrudRepositoryTemplate,
  renderCrudServiceTemplate,
  renderDtoTemplate,
  renderGuardTemplate,
  renderMiddlewareTemplate,
  renderModuleIndexTemplate,
  renderRepositoryTemplate,
  renderRepositoryTestTemplate,
  renderServiceTemplate,
  renderServiceTestTemplate,
  renderThrottleConfigTemplate,
  renderThrottleGuardTemplate,
  renderValueObjectTemplate,
} from "../templates.js";
import { writeTextFile } from "../utils/filesystem.js";
import { buildNameTokens } from "../utils/naming.js";

interface GenerateOptions {
  path?: string;
  route?: string;
  force?: boolean;
  flat?: boolean;
  withGuard?: boolean;
  withDto?: boolean;
  crud?: boolean;
  run?: boolean;
  quiet?: boolean;
}

type ControllerTestMode = "crud" | "simple" | null;

export function generateCommand(): Command {
  return new Command("generate")
    .alias("g")
    .description("Generate XTaskJS source files")
    .argument("<type>", `Artifact type: ${generatorKinds.join(", ")}`)
    .argument("<name>", "Logical artifact name, for example users or billing-report")
    .option("--path <directory>", "Target source directory", "src")
    .option("--route <path>", "Override the controller route path")
    .option("--flat", "Write scaffold files directly into --path instead of a feature subdirectory", false)
    .option("--with-guard", "Generate a guard and attach it to module/resource controllers", false)
    .option("--with-dto", "For resource scaffolds, also generate a DTO file", false)
    .option("--crud", "For resource scaffolds, generate CRUD-style controller, service, repository, and DTOs", false)
    .option("--run", "For test generators, emit runnable tests with basic mocks instead of skipped placeholders", false)
    .option("--quiet", "Suppress informational mode logs (useful for CI/pipelines)", false)
    .option("-f, --force", "Overwrite existing files", false)
    .action(async (rawType: string, rawName: string, options: GenerateOptions) => {
      const type = parseGeneratorKind(rawType);
      validateGenerateOptions(type, options);
      const tokens = buildNameTokens(rawName, options.route);
      const baseDirectory = resolve(process.cwd(), options.path ?? "src");
      const force = Boolean(options.force);
      const controllerTestMode = await resolveControllerTestMode(type, baseDirectory, tokens, options);

      if (controllerTestMode !== null && !options.quiet) {
        const modeMessage = controllerTestMode === "crud" ? "CRUD detected" : "fallback to simple";
        console.log(`Info: ${type}: ${modeMessage}`);
      }

      const files = await buildFiles(type, baseDirectory, tokens, options, controllerTestMode);
      for (const file of files) {
        await writeTextFile(file.path, file.contents, force);
        console.log(`Created ${file.path}`);
      }
    });
}

function parseGeneratorKind(value: string): GeneratorKind {
  if (generatorKinds.includes(value as GeneratorKind)) {
    return value as GeneratorKind;
  }

  throw new InvalidArgumentError(`Invalid generator type '${value}'. Expected one of: ${generatorKinds.join(", ")}`);
}

function validateGenerateOptions(type: GeneratorKind, options: GenerateOptions): void {
  if (options.withDto && type !== "resource") {
    throw new InvalidArgumentError("--with-dto is only supported for the resource generator.");
  }

  if (options.crud && type !== "resource" && type !== "controller-test") {
    throw new InvalidArgumentError("--crud is only supported for resource and controller-test generators.");
  }

  if (options.run && !isTestGenerator(type)) {
    throw new InvalidArgumentError("--run is only supported for controller-test, service-test, and resource-tests generators.");
  }
}

function isTestGenerator(type: GeneratorKind): boolean {
  return type === "controller-test" || type === "service-test" || type === "resource-tests";
}

async function buildFiles(
  type: GeneratorKind,
  baseDirectory: string,
  tokens: ReturnType<typeof buildNameTokens>,
  options: GenerateOptions,
  controllerTestMode: ControllerTestMode,
): Promise<Array<{ path: string; contents: string }>> {
  const guardPath = resolve(baseDirectory, `${tokens.kebabName}.guard.ts`);
  const middlewarePath = resolve(baseDirectory, `${tokens.kebabName}.middleware.ts`);
  const scaffoldDirectory = options.flat ? baseDirectory : resolve(baseDirectory, tokens.kebabName);
  const controllerPath = resolve(scaffoldDirectory, `${tokens.kebabName}.controller.ts`);
  const servicePath = resolve(scaffoldDirectory, `${tokens.kebabName}.service.ts`);
  const repositoryPath = resolve(scaffoldDirectory, `${tokens.kebabName}.repository.ts`);
  const controllerTestPath = resolve(baseDirectory, `${tokens.kebabName}.controller.spec.ts`);
  const serviceTestPath = resolve(baseDirectory, `${tokens.kebabName}.service.spec.ts`);
  const repositoryTestPath = resolve(baseDirectory, `${tokens.kebabName}.repository.spec.ts`);
  const dtoPath = resolve(scaffoldDirectory, `${tokens.kebabName}.dto.ts`);
  const scaffoldGuardPath = resolve(scaffoldDirectory, `${tokens.kebabName}.guard.ts`);
  const moduleIndexPath = resolve(scaffoldDirectory, "index.ts");
  const gatewayPath = resolve(baseDirectory, `${tokens.kebabName}.gateway.ts`);
  const valueObjectPath = resolve(baseDirectory, `${tokens.kebabName}.value-object.ts`);
  const aggregatePath = resolve(baseDirectory, `${tokens.kebabName}.aggregate.ts`);
  const subscriberPath = resolve(baseDirectory, `${tokens.kebabName}.subscriber.ts`);
  const throttleGuardPath = resolve(baseDirectory, `${tokens.kebabName}.throttle-guard.ts`);
  const throttleConfigPath = resolve(baseDirectory, `${tokens.kebabName}.throttle-config.ts`);
  const useGuard = Boolean(options.withGuard);
  const includeDto = Boolean(options.withDto || options.crud);
  const useCrud = Boolean(options.crud);
  const useCrudControllerTests = controllerTestMode === "crud";
  const runTests = Boolean(options.run);

  switch (type) {
    case "controller":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.controller.ts`), contents: renderControllerTemplate(tokens) }];
    case "service":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.service.ts`), contents: renderServiceTemplate(tokens) }];
    case "repository":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.repository.ts`), contents: renderRepositoryTemplate(tokens) }];
    case "controller-test":
      return [
        {
          path: controllerTestPath,
          contents: renderControllerTestTemplate(tokens, { run: runTests, crud: useCrudControllerTests }),
        },
      ];
    case "service-test":
      return [{ path: serviceTestPath, contents: renderServiceTestTemplate(tokens, { run: runTests }) }];
    case "resource-tests":
      return [
        {
          path: controllerTestPath,
          contents: renderControllerTestTemplate(tokens, { run: runTests, crud: useCrudControllerTests }),
        },
        { path: serviceTestPath, contents: renderServiceTestTemplate(tokens, { run: runTests }) },
        { path: repositoryTestPath, contents: renderRepositoryTestTemplate(tokens, { run: runTests }) },
      ];
    case "dto":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.dto.ts`), contents: renderDtoTemplate(tokens) }];
    case "guard":
      return [{ path: guardPath, contents: renderGuardTemplate(tokens) }];
    case "middleware":
      return [{ path: middlewarePath, contents: renderMiddlewareTemplate(tokens) }];
    case "resource":
      return [
        {
          path: repositoryPath,
          contents: useCrud ? renderCrudRepositoryTemplate(tokens) : renderRepositoryTemplate(tokens),
        },
        {
          path: servicePath,
          contents: useCrud ? renderCrudServiceTemplate(tokens) : renderServiceTemplate(tokens, { injectRepository: true }),
        },
        {
          path: controllerPath,
          contents: useCrud
            ? renderCrudControllerTemplate(tokens, { useGuard })
            : renderControllerTemplate(tokens, { injectService: true, useGuard }),
        },
        ...(includeDto ? [{ path: dtoPath, contents: renderDtoTemplate(tokens) }] : []),
        ...(useGuard ? [{ path: scaffoldGuardPath, contents: renderGuardTemplate(tokens) }] : []),
      ];
    case "module":
      return [
        { path: repositoryPath, contents: renderRepositoryTemplate(tokens) },
        { path: servicePath, contents: renderServiceTemplate(tokens, { injectRepository: true }) },
        {
          path: controllerPath,
          contents: renderControllerTemplate(tokens, { injectService: true, useGuard }),
        },
        { path: dtoPath, contents: renderDtoTemplate(tokens) },
        ...(useGuard ? [{ path: scaffoldGuardPath, contents: renderGuardTemplate(tokens) }] : []),
        { path: moduleIndexPath, contents: renderModuleIndexTemplate(tokens, { withGuard: useGuard }) },
      ];
    case "gateway":
      return [{ path: gatewayPath, contents: renderGatewayTemplate(tokens) }];
    case "value-object":
      return [{ path: valueObjectPath, contents: renderValueObjectTemplate(tokens) }];
    case "event-aggregate":
      return [{ path: aggregatePath, contents: renderEventAggregateTemplate(tokens) }];
    case "event-subscriber":
      return [{ path: subscriberPath, contents: renderEventSubscriberTemplate(tokens) }];
    case "throttle-guard":
      return [{ path: throttleGuardPath, contents: renderThrottleGuardTemplate(tokens) }];
    case "throttle-config":
      return [{ path: throttleConfigPath, contents: renderThrottleConfigTemplate(tokens) }];
  }
}

async function resolveControllerTestMode(
  type: GeneratorKind,
  baseDirectory: string,
  tokens: ReturnType<typeof buildNameTokens>,
  options: GenerateOptions,
): Promise<ControllerTestMode> {
  if (type !== "controller-test" && type !== "resource-tests") {
    return null;
  }

  if (options.crud) {
    return "crud";
  }

  const controllerPath = resolve(baseDirectory, `${tokens.kebabName}.controller.ts`);
  const nestedControllerPath = resolve(baseDirectory, tokens.kebabName, `${tokens.kebabName}.controller.ts`);
  const isCrud = await detectCrudController([controllerPath, nestedControllerPath]);

  return isCrud ? "crud" : "simple";
}

async function detectCrudController(controllerPaths: string[]): Promise<boolean> {
  const requiredMethods = ["list", "getById", "create", "update", "remove"];

  for (const controllerPath of controllerPaths) {
    try {
      const contents = await readFile(controllerPath, "utf8");
      const isCrudController = requiredMethods.every((methodName) =>
        new RegExp(`\\b${methodName}\\s*\\(`).test(contents),
      );

      if (isCrudController) {
        return true;
      }
    } catch {
      // Ignore missing/unreadable candidates and keep checking remaining paths.
    }
  }

  return false;
}