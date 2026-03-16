import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureEmptyDirectory(targetPath: string, force: boolean): Promise<void> {
  const exists = await pathExists(targetPath);
  if (!exists) {
    await mkdir(targetPath, { recursive: true });
    return;
  }

  const directoryState = await stat(targetPath);
  if (!directoryState.isDirectory()) {
    throw new Error(`Destination exists and is not a directory: ${targetPath}`);
  }

  const entries = await readdir(targetPath);
  if (entries.length > 0 && !force) {
    throw new Error(`Destination directory is not empty: ${targetPath}. Use --force to continue.`);
  }
}

export async function writeTextFile(filePath: string, contents: string, force: boolean): Promise<void> {
  const exists = await pathExists(filePath);
  if (exists && !force) {
    throw new Error(`File already exists: ${filePath}. Use --force to overwrite it.`);
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}