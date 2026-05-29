import { tool } from "@opencode-ai/plugin";
import { execFileSync } from "child_process";
import { existsSync } from "fs";

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

export default tool({
  description:
    "Fast content search tool that works with any codebase size. Searches file contents using regular expressions (ripgrep). Supports full regex syntax, glob filtering, file type filtering, context lines, and more.",
  args: {
    pattern: tool.schema
      .string()
      .optional()
      .describe("The regex pattern to search for in file contents. Can be omitted if using --files or --type-list."),
    path: tool.schema
      .string()
      .optional()
      .describe("File or directory to search in. Defaults to current working directory."),
    paths: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Multiple files or directories to search in."),
    glob: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Include or exclude files by glob pattern (e.g., '*.js', '!*.test.ts'). Supports .gitignore-style globs."),
    type: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Only search files matching this file type (e.g., 'py', 'rs', 'ts', 'js', 'md'). Use --type-list to see all."),
    typeNot: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Exclude files of this file type (e.g., 'html', 'css')."),
    fixedStrings: tool.schema
      .boolean()
      .optional()
      .describe("Treat pattern as a literal string, not a regex (equivalent to grep -F)."),
    ignoreCase: tool.schema
      .boolean()
      .optional()
      .describe("Search case insensitively. Overrides --case-sensitive and --smart-case."),
    smartCase: tool.schema
      .boolean()
      .optional()
      .describe("Search case insensitively if pattern is all lowercase, otherwise case sensitive."),
    invertMatch: tool.schema
      .boolean()
      .optional()
      .describe("Show lines that do NOT match the pattern."),
    wordRegexp: tool.schema
      .boolean()
      .optional()
      .describe("Only show matches surrounded by word boundaries."),
    lineRegexp: tool.schema
      .boolean()
      .optional()
      .describe("Only show matches where the entire line matches."),
    multiline: tool.schema
      .boolean()
      .optional()
      .describe("Enable searching across multiple lines (allows \\n in patterns)."),
    pcre2: tool.schema
      .boolean()
      .optional()
      .describe("Use PCRE2 regex engine for look-around and backreferences."),
    encoding: tool.schema
      .string()
      .optional()
      .describe("Text encoding of files (e.g., 'utf-8', 'utf-16', 'shift-jis', 'auto', 'none')."),
    hidden: tool.schema
      .boolean()
      .optional()
      .describe("Search hidden files and directories (those starting with dot)."),
    follow: tool.schema
      .boolean()
      .optional()
      .describe("Follow symbolic links while traversing directories."),
    noIgnore: tool.schema
      .boolean()
      .optional()
      .describe("Do not respect .gitignore, .ignore, or .rgignore files."),
    noIgnoreVcs: tool.schema
      .boolean()
      .optional()
      .describe("Do not respect .gitignore files specifically."),
    unrestricted: tool.schema
      .number()
      .optional()
      .describe("Level of unrestricted search (1-3). 1=no ignore, 2=+hidden, 3=+binary."),
    context: tool.schema
      .number()
      .optional()
      .describe("Show NUM lines before and after each match (-C)."),
    beforeContext: tool.schema
      .number()
      .optional()
      .describe("Show NUM lines before each match (-B)."),
    afterContext: tool.schema
      .number()
      .optional()
      .describe("Show NUM lines after each match (-A)."),
    count: tool.schema
      .boolean()
      .optional()
      .describe("Show only count of matching lines per file."),
    countMatches: tool.schema
      .boolean()
      .optional()
      .describe("Show count of individual matches per file (not lines)."),
    filesWithMatches: tool.schema
      .boolean()
      .optional()
      .describe("Only print paths with at least one match (-l)."),
    filesWithoutMatch: tool.schema
      .boolean()
      .optional()
      .describe("Only print paths with zero matches."),
    onlyMatching: tool.schema
      .boolean()
      .optional()
      .describe("Print only the matched parts of a line (-o)."),
    lineNumber: tool.schema
      .boolean()
      .optional()
      .describe("Show line numbers (1-based). Default when stdout is a tty."),
    noLineNumber: tool.schema
      .boolean()
      .optional()
      .describe("Suppress line numbers."),
    column: tool.schema
      .boolean()
      .optional()
      .describe("Show column numbers (implies --line-number)."),
    heading: tool.schema
      .boolean()
      .optional()
      .describe("Print file path above clusters of matches from each file."),
    noHeading: tool.schema
      .boolean()
      .optional()
      .describe("Print file path as prefix for each matched line."),
    pretty: tool.schema
      .boolean()
      .optional()
      .describe("Alias for --color=always --heading --line-number."),
    json: tool.schema
      .boolean()
      .optional()
      .describe("Output in JSON Lines format."),
    replace: tool.schema
      .string()
      .optional()
      .describe("Replace every match with the given text. Supports capture groups ($1, $2, etc.)."),
    maxCount: tool.schema
      .number()
      .optional()
      .describe("Limit the number of matching lines per file (-m)."),
    maxDepth: tool.schema
      .number()
      .optional()
      .describe("Limit directory traversal depth (-d). 0 = only given paths."),
    maxFilesize: tool.schema
      .string()
      .optional()
      .describe("Ignore files larger than this size (e.g., '50K', '80M', '1G')."),
    color: tool.schema
      .string()
      .optional()
      .describe("When to use colors: 'never', 'auto', 'always', 'ansi'."),
    quiet: tool.schema
      .boolean()
      .optional()
      .describe("Do not print anything to stdout. Exit code indicates match found."),
    stats: tool.schema
      .boolean()
      .optional()
      .describe("Print aggregate statistics about the search."),
    sort: tool.schema
      .string()
      .optional()
      .describe("Sort results: 'none', 'path', 'modified', 'accessed', 'created'."),
    sortr: tool.schema
      .string()
      .optional()
      .describe("Sort in descending order: 'none', 'path', 'modified', 'accessed', 'created'."),
    byteOffset: tool.schema
      .boolean()
      .optional()
      .describe("Print 0-based byte offset before each line (-b)."),
    null: tool.schema
      .boolean()
      .optional()
      .describe("Print NUL byte after file paths (useful with xargs -0)."),
    threads: tool.schema
      .number()
      .optional()
      .describe("Approximate number of threads to use. 0 = auto."),
    text: tool.schema
      .boolean()
      .optional()
      .describe("Search binary files as if they were text (-a)."),
    binary: tool.schema
      .boolean()
      .optional()
      .describe("Search binary files but stop after first NUL byte after a match."),
    engine: tool.schema
      .string()
      .optional()
      .describe("Regex engine to use: 'default', 'pcre2', 'auto'."),
    fieldMatchSeparator: tool.schema
      .string()
      .optional()
      .describe("Separator between fields in match output (default ':')."),
    fieldContextSeparator: tool.schema
      .string()
      .optional()
      .describe("Separator between fields in context output (default '-')."),
    contextSeparator: tool.schema
      .string()
      .optional()
      .describe("String to separate non-contiguous context lines (default '--')."),
    noContextSeparator: tool.schema
      .boolean()
      .optional()
      .describe("Disable context separators completely."),
    passthru: tool.schema
      .boolean()
      .optional()
      .describe("Print both matching and non-matching lines."),
    trim: tool.schema
      .boolean()
      .optional()
      .describe("Remove leading ASCII whitespace from each printed line."),
    vimgrep: tool.schema
      .boolean()
      .optional()
      .describe("Print every match on its own line with line and column numbers."),
    files: tool.schema
      .boolean()
      .optional()
      .describe("Print each file that would be searched without searching."),
    typeList: tool.schema
      .boolean()
      .optional()
      .describe("Show all supported file types and their globs."),
    includeZero: tool.schema
      .boolean()
      .optional()
      .describe("Print count even for files with zero matches (with --count)."),
    noRequireGit: tool.schema
      .boolean()
      .optional()
      .describe("Respect .gitignore even outside a git repository."),
    oneFileSystem: tool.schema
      .boolean()
      .optional()
      .describe("Do not cross file system boundaries."),
  },
  async execute(args, context) {
    const rgArgs: string[] = [];
    const warnings: string[] = [];

    // --directory from context
    const workDir = context.directory || process.cwd();

    // --- Boolean flags that don't need values ---
    const boolFlags: [string, string | undefined][] = [
      ["fixedStrings", "--fixed-strings"],
      ["ignoreCase", "--ignore-case"],
      ["smartCase", "--smart-case"],
      ["invertMatch", "--invert-match"],
      ["wordRegexp", "--word-regexp"],
      ["lineRegexp", "--line-regexp"],
      ["multiline", "--multiline"],
      ["pcre2", "--pcre2"],
      ["hidden", "--hidden"],
      ["follow", "--follow"],
      ["noIgnore", "--no-ignore"],
      ["noIgnoreVcs", "--no-ignore-vcs"],
      ["count", "--count"],
      ["countMatches", "--count-matches"],
      ["filesWithMatches", "--files-with-matches"],
      ["filesWithoutMatch", "--files-without-match"],
      ["onlyMatching", "--only-matching"],
      ["lineNumber", "--line-number"],
      ["noLineNumber", "--no-line-number"],
      ["column", "--column"],
      ["heading", "--heading"],
      ["noHeading", "--no-heading"],
      ["pretty", "--pretty"],
      ["json", "--json"],
      ["quiet", "--quiet"],
      ["stats", "--stats"],
      ["byteOffset", "--byte-offset"],
      ["null", "--null"],
      ["text", "--text"],
      ["binary", "--binary"],
      ["passthru", "--passthru"],
      ["trim", "--trim"],
      ["vimgrep", "--vimgrep"],
      ["files", "--files"],
      ["typeList", "--type-list"],
      ["includeZero", "--include-zero"],
      ["noRequireGit", "--no-require-git"],
      ["oneFileSystem", "--one-file-system"],
      ["noContextSeparator", "--no-context-separator"],
    ];

    for (const [key, flag] of boolFlags) {
      if ((args as any)[key]) {
        rgArgs.push(flag);
      }
    }

    // --- String/number flags ---
    const valueFlags: [string, string][] = [
      ["context", "--context"],
      ["beforeContext", "--before-context"],
      ["afterContext", "--after-context"],
      ["maxCount", "--max-count"],
      ["maxDepth", "--max-depth"],
      ["encoding", "--encoding"],
      ["replace", "--replace"],
      ["sort", "--sort"],
      ["sortr", "--sortr"],
      ["color", "--color"],
      ["engine", "--engine"],
      ["maxFilesize", "--max-filesize"],
      ["threads", "--threads"],
      ["fieldMatchSeparator", "--field-match-separator"],
      ["fieldContextSeparator", "--field-context-separator"],
      ["contextSeparator", "--context-separator"],
    ];

    for (const [key, flag] of valueFlags) {
      const val = (args as any)[key];
      if (val !== undefined && val !== null && val !== "") {
        rgArgs.push(flag, String(val));
      }
    }

    // --- unrestricted (0-3) ---
    if (args.unrestricted !== undefined) {
      if (args.unrestricted >= 1 && args.unrestricted <= 3) {
        for (let i = 0; i < args.unrestricted; i++) {
          rgArgs.push("-u");
        }
      } else {
        warnings.push(`WARNING: unrestricted must be 1-3, got ${args.unrestricted}, ignoring`);
      }
    }

    // --- glob ---
    if (args.glob) {
      for (const g of args.glob) {
        rgArgs.push("--glob", g);
      }
    }

    // --- type ---
    if (args.type) {
      for (const t of args.type) {
        rgArgs.push("--type", t);
      }
    }

    // --- type-not ---
    if (args.typeNot) {
      for (const t of args.typeNot) {
        rgArgs.push("--type-not", t);
      }
    }

    // --- pattern (positional) ---
    const allPositional: string[] = [];
    if (args.pattern) {
      allPositional.push(args.pattern);
    } else if (!args.files && !args.typeList) {
      return "ERROR: 'pattern' is required unless --files or --type-list is used. Provide a regex pattern to search for.";
    }

    // --- paths (positional) ---
    if (args.path) {
      allPositional.push(args.path);
    }
    if (args.paths) {
      allPositional.push(...args.paths);
    }

    // Validate paths exist
    for (const p of allPositional.slice(args.pattern ? 1 : 0)) {
      if (!existsSync(p)) {
        return `ERROR: Path not found: '${p}'. Verify the path exists.`;
      }
    }

    if (allPositional.length > 0) {
      rgArgs.push("--", ...allPositional);
    }

    try {
      const output = execFileSync("rg", rgArgs, {
        encoding: "utf-8",
        cwd: workDir,
        maxBuffer: 50 * 1024 * 1024,
      });

      const header = warnings.length > 0 ? warnings.join("\n") + "\n" : "";
      return header + output;
    } catch (error: any) {
      const header = warnings.length > 0 ? warnings.join("\n") + "\n" : "";

      // Exit code 1 = no matches found (valid result, not an error)
      if (error.status === 1) {
        return header;
      }

      const stderr = stripAnsi(error.stderr || "");
      if (!stderr) {
        return `ERROR: rg process failed (exit code ${error.status || "unknown"}). Check arguments and try again.`;
      }

      const lines = stderr.split("\n").map(l => l.trim()).filter(Boolean);
      const lastError = lines.filter(l =>
        l.startsWith("error:") || l.startsWith("Error:") || l.startsWith("rg:")
      ).pop() || lines[lines.length - 1] || "Unknown error";

      if (lastError.includes("No such file") || lastError.includes("No such file or directory")) {
        return `ERROR: File or directory not found. Verify the path exists.`;
      }
      if (lastError.includes("regex parse error") || lastError.includes("error:")) {
        const clean = lastError
          .replace(/^rg: /, "")
          .replace(/^error: /i, "")
          .replace(/^regex parse error:?\s*/i, "")
          .trim();
        return `ERROR: Invalid regex pattern: ${clean || "Invalid pattern"}. Check your pattern syntax.`;
      }
      if (lastError.includes("is a directory")) {
        return `ERROR: Path is a directory, not a file. Use a file path or search a directory without specifying a file.`;
      }
      if (lastError.includes("Permission denied")) {
        return `ERROR: Permission denied. Check read permissions on the file or directory.`;
      }
      if (lastError.includes("Unknown")) {
        return `ERROR: Unknown option or value. Check argument names and values.`;
      }
      if (lastError.includes("not found") || lastError.includes("No such")) {
        return `ERROR: ${lastError}. Verify the input is correct.`;
      }

      return `ERROR: ${lastError}`;
    }
  },
});
