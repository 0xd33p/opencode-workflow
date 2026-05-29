import { tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";
import { statSync, existsSync } from "fs";
import { join } from "path";

/**
 * Optimized Ctags tool for reducing token usage by providing a symbolic map of the codebase.
 * Filters out common noise (node_modules, .venv) and focuses on structural elements.
 */
export default tool({
  description: "Scan a file or directory for symbols (functions, classes, methods) using ctags. Use this BEFORE read() to locate symbols and know which line range to read — saves tokens.",
  args: {
    path: tool.schema.string().describe("File or directory path. Accepts both absolute (/home/...) and relative (backend/app) paths."),
    lang: tool.schema.enum(["python", "typescript", "rust", "go", "cpp", "java", "javascript"]).optional().describe("Language filter. REQUIRED when path is a directory; optional for single files."),
  },
  async execute(args, context) {
    const rawPath = args.path || ".";
    const isAbsolute = rawPath.startsWith("/");
    const targetPath = isAbsolute ? rawPath : join(context.directory, rawPath);
    const absolutePath = targetPath;

    // 1. Validation: Check if path exists
    if (!existsSync(absolutePath)) {
      return `[ctags] Path not found: "${targetPath}". Use absolute (/home/...) or relative path from project root.`;
    }

    // 2. Validation: Mandatory language for directories
    const isDirectory = statSync(absolutePath).isDirectory();
    if (isDirectory && !args.lang) {
      return `[ctags] lang is required for directories. Example: ctags({ path: "${targetPath}", lang: "python" }). Supported: python, typescript, rust, go, cpp, java, javascript.`;
    }
    
    // Define safe exclusion patterns
    const excludes = [
      "node_modules",
      ".venv",
      "venv",
      "dist",
      "build",
      "target",
      "__pycache__",
      ".git",
      ".ruff_cache",
      ".pytest_cache",
      "htmlcov"
    ].map(e => `--exclude=${e}`).join(" ");

    // Define language-specific kind filters
    const kindFilters: Record<string, string> = {
      python: "--python-kinds=fc",
      typescript: "--typescript-kinds=fcm",
      javascript: "--javascript-kinds=fcm",
      rust: "--rust-kinds=fct",
      go: "--go-kinds=fsi",
      cpp: "--c++-kinds=cxm",
      java: "--java-kinds=cim",
    };

    let command = `ctags -R --output-format=json ${excludes} --fields=+n+s+k+e`;

    if (args.lang && kindFilters[args.lang]) {
      command += ` --languages=${args.lang} ${kindFilters[args.lang]}`;
    } else if (args.lang) {
      command += ` --languages=${args.lang}`;
    } else {
      // For single files without explicit language, use a generic structural filter
      command += " --python-kinds=fc --typescript-kinds=fcm --rust-kinds=fct";
    }

    command += ` ${targetPath}`;

    try {
      const output = execSync(command, { encoding: "utf-8", cwd: context.directory });
      
      if (!output.trim()) {
        return `[ctags] No symbols found in "${targetPath}". The file may be empty or contain only unsupported constructs. Use ctags on a directory with lang to list available symbols.`;
      }

      const lines = output.trim().split("\n");
      const results = lines.map(line => {
        try {
          const tag = JSON.parse(line);
          return {
            name: tag.name,
            kind: tag.kind,
            path: tag.path,
            line: tag.line,
            end: tag.end,
            scope: tag.scope || undefined
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      return JSON.stringify(results, null, 2);
    } catch (error: any) {
      return `[ctags] Execution failed. Correct syntax: ctags({ path: "<file_or_dir>", lang: "<language>" }). Path must exist and lang is required for directories. Supported languages: python, typescript, rust, go, cpp, java, javascript.`;
    }
  },
});
