import { tool } from "@opencode-ai/plugin";
import { execFileSync, type ExecFileSyncOptions } from "child_process";
import { existsSync } from "fs";

const ARG_RE = /^[a-zA-Z_][a-zA-Z0-9_]*=.+$/;

export default tool({
  description:
    "Run jq queries against JSON data or files. Supports filtering, transformation, and extraction of JSON data.",
  args: {
    query: tool.schema
      .string()
      .describe(
        "jq filter expression (e.g. '.key', '.[] | select(.x > 1)', 'group_by(.type)')"
      ),
    data: tool.schema
      .string()
      .optional()
      .describe("JSON string to query (mutually exclusive with file)"),
    file: tool.schema
      .string()
      .optional()
      .describe("Path to JSON file to query (mutually exclusive with data)"),
    raw: tool.schema
      .boolean()
      .optional()
      .describe("Output raw strings instead of JSON-quoted strings (-r)"),
    compact: tool.schema
      .boolean()
      .optional()
      .describe("Compact output instead of pretty-printed (-c)"),
    slurp: tool.schema
      .boolean()
      .optional()
      .describe("Read entire input as a single array (-s)"),
    arg: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Pass string variables via --arg (format: name=value, e.g. ['key=foo', 'name=bar'])"
      ),
    argjson: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Pass JSON variables via --argjson (format: name=value, e.g. ['items=[1,2,3]'])"
      ),
    nullInput: tool.schema
      .boolean()
      .optional()
      .describe("Use null as the single input value (-n) instead of data/file"),
    rawInput: tool.schema
      .boolean()
      .optional()
      .describe("Read each line as a string instead of parsing as JSON (-R)"),
    sortKeys: tool.schema
      .boolean()
      .optional()
      .describe("Sort keys of each object on output (-S)"),
  },
  async execute(args, _context) {
    if (!args.query?.trim()) {
      throw new Error("Query must be a non-empty jq filter expression.");
    }

    if (args.nullInput) {
      if (args.data || args.file) {
        throw new Error("When nullInput is set, do not provide 'data' or 'file'.");
      }
    } else if (args.rawInput) {
      if (!args.data && !args.file) {
        throw new Error("When rawInput is set, provide 'data' or 'file'.");
      }
    } else {
      if (!args.data && !args.file) {
        throw new Error("Either 'data' or 'file' must be provided.");
      }
    }
    if (args.data && args.file) {
      throw new Error("Provide only one of 'data' or 'file', not both.");
    }

    if (args.data) {
      try {
        JSON.parse(args.data);
      } catch {
        throw new Error("The 'data' argument is not valid JSON. Check for missing quotes, trailing commas, or other syntax issues.");
      }
    }

    const jqArgs: string[] = [];

    if (args.nullInput) jqArgs.push("-n");
    if (args.rawInput) jqArgs.push("-R");
    if (args.slurp) jqArgs.push("-s");
    if (args.sortKeys) jqArgs.push("-S");
    if (args.raw) jqArgs.push("-r");
    if (args.compact) jqArgs.push("-c");

    for (const entry of args.arg ?? []) {
      if (!ARG_RE.test(entry)) {
        throw new Error(
          `Invalid --arg format: "${entry}". Use 'name=value' where name is a valid identifier and value is non-empty.`
        );
      }
      const eqIndex = entry.indexOf("=");
      jqArgs.push("--arg", entry.slice(0, eqIndex), entry.slice(eqIndex + 1));
    }

    for (const entry of args.argjson ?? []) {
      if (!ARG_RE.test(entry)) {
        throw new Error(
          `Invalid --argjson format: "${entry}". Use 'name=value' where value is valid JSON.`
        );
      }
      const eqIndex = entry.indexOf("=");
      const jsonVal = entry.slice(eqIndex + 1);
      try {
        JSON.parse(jsonVal);
      } catch {
        throw new Error(
          `Invalid JSON value in argjson: "${jsonVal}". Must be valid JSON.`
        );
      }
      jqArgs.push("--argjson", entry.slice(0, eqIndex), jsonVal);
    }

    jqArgs.push(args.query);

    if (args.file) {
      if (!existsSync(args.file)) {
        throw new Error(`File not found: "${args.file}". Verify the file path is correct and the file exists.`);
      }
      jqArgs.push(args.file);
    }

    try {
      const opts: ExecFileSyncOptions = {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      };
      if (args.data) {
        opts.input = args.data;
      }
      return execFileSync("jq", jqArgs, opts).toString();
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string };
      const stderr = (err.stderr?.toString() || err.message || "").replace(
        /\x1B\[[0-9;]*[a-zA-Z]/g,
        ""
      );

      if (stderr.includes("is not defined")) {
        throw new Error(
          `Variable not defined in query: "${args.query}". Use --arg (string) or --argjson (JSON) to define variables referenced with $.`
        );
      }
      if (
        stderr.includes("parse error") ||
        stderr.includes("syntax error")
      ) {
        throw new Error(
          `Query syntax error: "${args.query}". Check the query syntax — make sure parentheses, pipes, and operators are correct. Example: ".key", ".[] | select(.x > 1)", "group_by(.type)"`
        );
      }
      if (
        stderr.includes("No such file") ||
        stderr.includes("Cannot read")
      ) {
        throw new Error(
          `File not found: "${args.file}". Verify the file path is correct.`
        );
      }

      let helpText = "(could not retrieve jq --help)";
      try {
        helpText = execFileSync("jq", ["--help"], {
          encoding: "utf-8",
        }).toString();
      } catch {
        // silently ignore
      }

      throw new Error(
        `jq execution failed for query: "${args.query}". Here is the jq --help output for reference:\n\n${helpText}`
      );
    }
  },
});
