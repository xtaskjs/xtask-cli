#!/usr/bin/env node

import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { generateCommand } from "./commands/generate.js";

const program = new Command();

program
  .name("xtask")
  .description("CLI for creating XTaskJS projects and generating common artifacts")
  .version("0.1.0");

program.addCommand(createCommand());
program.addCommand(generateCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});