export interface NameTokens {
  rawName: string;
  kebabName: string;
  pascalName: string;
  camelName: string;
  routePath: string;
}

export function buildNameTokens(rawName: string, routeOverride?: string): NameTokens {
  validateName(rawName);

  const words = splitWords(rawName);
  const kebabName = words.join("-");
  const pascalName = words.map(capitalize).join("");
  const leadingCharacter = pascalName.charAt(0);
  const camelName = pascalName.length === 0 ? "" : leadingCharacter.toLowerCase() + pascalName.slice(1);

  return {
    rawName,
    kebabName,
    pascalName,
    camelName,
    routePath: normalizeRoute(routeOverride ?? `/${kebabName}`),
  };
}

export function toKebabCase(value: string): string {
  return splitWords(value).join("-");
}

export function toTitleCase(value: string): string {
  return splitWords(value).map(capitalize).join(" ");
}

function splitWords(value: string): string[] {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function normalizeRoute(value: string): string {
  const normalized = value.trim().replace(/\/+/g, "/");
  if (normalized === "") {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function validateName(value: string): void {
  if (splitWords(value).length === 0) {
    throw new Error("Name must contain at least one alphanumeric character.");
  }

  if (/[/\\]/.test(value)) {
    throw new Error("Names cannot contain path separators. Use --path to choose a target directory.");
  }
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}