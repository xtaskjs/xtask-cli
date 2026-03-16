import { resolve } from "node:path";
import { Command, InvalidArgumentError } from "commander";
import {
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
  renderServiceTemplate,
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
}

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
    .option("-f, --force", "Overwrite existing files", false)
    .action(async (rawType: string, rawName: string, options: GenerateOptions) => {
      const type = parseGeneratorKind(rawType);
      validateGenerateOptions(type, options);
      const tokens = buildNameTokens(rawName, options.route);
      const baseDirectory = resolve(process.cwd(), options.path ?? "src");
      const force = Boolean(options.force);

      const files = buildFiles(type, baseDirectory, tokens, options);
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
  if ((options.withDto || options.crud) && type !== "resource") {
    throw new InvalidArgumentError("--with-dto and --crud are only supported for the resource generator.");
  }
}

function buildFiles(
  type: GeneratorKind,
  baseDirectory: string,
  tokens: ReturnType<typeof buildNameTokens>,
  options: GenerateOptions,
): Array<{ path: string; contents: string }> {
  const guardPath = resolve(baseDirectory, `${tokens.kebabName}.guard.ts`);
  const middlewarePath = resolve(baseDirectory, `${tokens.kebabName}.middleware.ts`);
  const scaffoldDirectory = options.flat ? baseDirectory : resolve(baseDirectory, tokens.kebabName);
  const controllerPath = resolve(scaffoldDirectory, `${tokens.kebabName}.controller.ts`);
  const servicePath = resolve(scaffoldDirectory, `${tokens.kebabName}.service.ts`);
  const repositoryPath = resolve(scaffoldDirectory, `${tokens.kebabName}.repository.ts`);
  const dtoPath = resolve(scaffoldDirectory, `${tokens.kebabName}.dto.ts`);
  const scaffoldGuardPath = resolve(scaffoldDirectory, `${tokens.kebabName}.guard.ts`);
  const moduleIndexPath = resolve(scaffoldDirectory, "index.ts");
  const useGuard = Boolean(options.withGuard);
  const includeDto = Boolean(options.withDto || options.crud);
  const useCrud = Boolean(options.crud);

  switch (type) {
    case "controller":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.controller.ts`), contents: renderControllerTemplate(tokens) }];
    case "service":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.service.ts`), contents: renderServiceTemplate(tokens) }];
    case "repository":
      return [{ path: resolve(baseDirectory, `${tokens.kebabName}.repository.ts`), contents: renderRepositoryTemplate(tokens) }];
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
  }
}