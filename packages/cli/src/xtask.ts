#!/usr/bin/env node

import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { cacheCommand } from "./commands/cache.js";
import { createCommand } from "./commands/create.js";
import { generateCommand } from "./commands/generate.js";

const program = new Command();

program
  .name("xtask")
  .description("CLI for creating XTaskJS projects and generating common artifacts")
  .version("0.1.3");

program.addCommand(createCommand());
program.addCommand(generateCommand());
program.addCommand(cacheCommand());
program.addCommand(addCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});