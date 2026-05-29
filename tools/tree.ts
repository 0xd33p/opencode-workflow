import { tool } from "@opencode-ai/plugin";
import { execFileSync } from "child_process";
import { existsSync } from "fs";

export default tool({
  description:
    "Display project directory structure, automatically excluding common garbage directories (node_modules, __pycache__, venv, env) and hidden files.",
  args: {
    path: tool.schema
      .string()
      .optional()
      .describe("Directory path to view (defaults to current directory)"),
    level: tool.schema
      .number()
      .optional()
      .describe("Maximum display depth (equivalent to tree -L option)"),
  },
  async execute(args, context) {
    const errors: string[] = [];
    const treeArgs: string[] = [
      "-I",
      "node_modules|__pycache__|venv|env|\\..*",
      "-a",
      "--matchdirs",
    ];

    if (args.level !== undefined) {
      if (Number.isInteger(args.level) && args.level >= 1 && args.level <= 10) {
        treeArgs.push("-L", String(args.level));
      } else {
        errors.push(
          `WARNING: level must be an integer between 1 and 10, ignoring '${args.level}'`,
        );
      }
    }

    const targetPath = args.path || context.directory || ".";
    if (!existsSync(targetPath)) {
      throw new Error(
        `Directory not found: '${targetPath}'. Verify the path exists.`,
      );
    }
    treeArgs.push(targetPath);

    try {
      const output = execFileSync("tree", treeArgs, { encoding: "utf-8" });
      const header = errors.length > 0 ? errors.join("\n") + "\n" : "";
      return header + output;
    } catch (error: any) {
      const stderr = (error.stderr || error.message || "").replace(
        /\x1B\[[0-9;]*[a-zA-Z]/g,
        "",
      );
      const bottomLine = stderr.split("\n").filter(Boolean).pop() || stderr;

      if (
        bottomLine.includes("No such file") ||
        bottomLine.includes("os error 2")
      ) {
        throw new Error(
          `Directory not found: '${targetPath}'. Verify the path exists.`,
        );
      }
      if (bottomLine.includes("Permission denied")) {
        throw new Error("Permission denied. Check directory permissions.");
      }

      throw new Error(
        `Failed to run tree: ${bottomLine || "Unknown error"}. Ensure 'tree' is installed.`,
      );
    }
  },
});
