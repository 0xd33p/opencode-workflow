import { tool } from "@opencode-ai/plugin";
import { execFileSync } from "child_process";
import { existsSync } from "fs";

const LINE_RANGE_RE = /^(\d+)?(:(\d+)?(\+(\d+))?)?$/;
const HIGHLIGHT_LINE_RE = /^(\d+)?(:(\d+)?(\+(\d+))?)?$/;
const VALID_STYLES = new Set([
  "plain",
  "full",
  "numbers",
  "changes",
  "header",
  "grid",
  "rule",
  "snip",
]);
const VALID_WRAP = new Set(["auto", "never", "character"]);

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

export default tool({
  description:
    "View file contents with syntax highlighting (using bat). Supports multiple programming languages, line numbers, Git diff, custom themes and styles.",
  args: {
    path: tool.schema.string().describe("Path to the file to view (required)"),
    language: tool.schema
      .string()
      .optional()
      .describe(
        "Specify language for syntax highlighting (e.g., 'rust', 'python', 'cpp', 'json', 'markdown')",
      ),
    lineRange: tool.schema
      .string()
      .optional()
      .describe(
        "Print only a range of lines, e.g., '30:40', ':40', '40:', '40', '30:+10'",
      ),
    highlightLine: tool.schema
      .string()
      .optional()
      .describe(
        "Highlight a line, e.g., '40', '30:40', ':40', '40:', '30:+10'",
      ),
    style: tool.schema
      .string()
      .optional()
      .describe(
        "Display style: 'plain', 'full', 'numbers', 'changes', 'header', 'grid', 'rule', 'snip', or comma-separated combination",
      ),
    theme: tool.schema
      .string()
      .optional()
      .describe(
        "Theme for syntax highlighting, e.g., 'Dracula', 'Monokai', 'GitHub', 'OneHalfDark', 'TwoDark'",
      ),
    number: tool.schema
      .boolean()
      .optional()
      .describe("Show line numbers alongside content (--style=numbers)"),
    showAll: tool.schema
      .boolean()
      .optional()
      .describe("Show non-printable characters (space, tab, newline)"),
    diff: tool.schema
      .boolean()
      .optional()
      .describe("Only show lines changed compared to Git index"),
    diffContext: tool.schema
      .number()
      .optional()
      .describe("Number of context lines around when using --diff"),
    wrap: tool.schema
      .string()
      .optional()
      .describe("Wrap mode: 'auto', 'never', 'character'"),
    tabs: tool.schema
      .number()
      .optional()
      .describe("Tab width (number of spaces)"),
  },
  async execute(args, context) {
    const errors: string[] = [];
    const batArgs: string[] = [];

    // --- Validate required path ---
    if (!args.path) {
      return "ERROR: 'path' is required. Usage: provide the absolute path to a file to view with bat.";
    }
    if (!existsSync(args.path)) {
      return `ERROR: File not found: '${args.path}'. Provide an existing file path.`;
    }

    // --- Validate & build arguments ---

    if (args.language) {
      batArgs.push("--language", args.language);
    }

    if (args.lineRange) {
      if (LINE_RANGE_RE.test(args.lineRange)) {
        batArgs.push("--line-range", args.lineRange);
      } else {
        errors.push(
          `WARNING: Invalid lineRange '${args.lineRange}', ignoring. Expected format: '30:40', ':40', '40:', '40', '30:+10'`,
        );
      }
    }

    if (args.highlightLine) {
      if (HIGHLIGHT_LINE_RE.test(args.highlightLine)) {
        batArgs.push("--highlight-line", args.highlightLine);
      } else {
        errors.push(
          `WARNING: Invalid highlightLine '${args.highlightLine}', ignoring. Expected format: '40', '30:40', ':40', '40:', '30:+10'`,
        );
      }
    }

    if (args.style) {
      const styles = args.style.split(",").map((s) => s.trim());
      const allValid = styles.every((s) => VALID_STYLES.has(s));
      if (allValid) {
        batArgs.push("--style", args.style);
      } else {
        const invalid = styles.filter((s) => !VALID_STYLES.has(s));
        errors.push(
          `WARNING: Invalid style(s) '${invalid.join(",")}', ignoring --style. Valid: ${[...VALID_STYLES].join(", ")}`,
        );
      }
    }

    if (args.theme) {
      batArgs.push("--theme", args.theme);
    }

    if (args.number) {
      batArgs.push("--number");
    }

    if (args.showAll) {
      batArgs.push("--show-all");
    }

    if (args.diff) {
      batArgs.push("--diff");
    }

    if (args.diffContext !== undefined) {
      if (args.diffContext >= 0) {
        batArgs.push("--diff-context", String(args.diffContext));
      } else {
        errors.push("WARNING: diffContext must be >= 0, ignoring");
      }
    }

    if (args.wrap) {
      if (VALID_WRAP.has(args.wrap)) {
        batArgs.push("--wrap", args.wrap);
      } else {
        errors.push(
          `WARNING: Invalid wrap '${args.wrap}', ignoring. Valid: ${[...VALID_WRAP].join(", ")}`,
        );
      }
    }

    if (args.tabs !== undefined) {
      if (args.tabs >= 1 && args.tabs <= 8) {
        batArgs.push("--tabs", String(args.tabs));
      } else {
        errors.push("WARNING: tabs must be between 1 and 8, ignoring");
      }
    }

    // --- Execute ---
    batArgs.push(args.path);

    try {
      const output = execFileSync("bat", batArgs, { encoding: "utf-8" });
      const header = errors.length > 0 ? errors.join("\n") + "\n" : "";
      return header + output;
    } catch (error: any) {
      const stderr = stripAnsi(error.stderr || error.message || "");
      const stderrLines = stderr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const batError =
        stderrLines.length > 0 ? stderrLines[stderrLines.length - 1] : "";

      if (
        batError.includes("No such file") ||
        batError.includes("os error 2")
      ) {
        return `ERROR: File not found: '${args.path}'. Verify the file exists before calling bat.`;
      }
      if (batError.includes("is a directory")) {
        return `ERROR: '${args.path}' is a directory, not a file. Provide a file path.`;
      }
      if (
        batError.includes("Permission denied") ||
        batError.includes("os error 13")
      ) {
        return `ERROR: Permission denied reading '${args.path}'. Check file permissions.`;
      }
      if (batError.includes("Grid:") || batError.includes("Unknown")) {
        return `ERROR: bat returned: ${batError}. Verify argument values. Valid languages: '--list-languages'. Valid themes: '--list-themes'.`;
      }

      return `ERROR running bat: ${batError || stderr || "Unknown error"}. Pass valid arguments to bat.`;
    }
  },
});
