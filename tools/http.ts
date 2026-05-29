import { tool } from "@opencode-ai/plugin";
import { execFileSync } from "child_process";

/**
 * Modern, user-friendly command-line HTTP client (HTTPie) wrapper for Opencode.
 */
export default tool({
  description:
    "Modern, user-friendly command-line HTTP client (HTTPie). Useful for making API requests, testing endpoints, and viewing formatted responses.",
  args: {
    url: tool.schema.string().describe("The request URL (e.g., 'https://api.example.com/users')"),
    method: tool.schema
      .string()
      .optional()
      .describe("HTTP method (GET, POST, PUT, DELETE, etc.). Defaults to GET (or POST if data is provided)."),
    headers: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("HTTP headers in 'Name:Value' format (e.g., ['Authorization:Bearer token', 'Accept:application/json'])"),
    data: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Data fields in 'key=value' (string) or 'key:=value' (JSON) format. Used for body data."
      ),
    params: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("URL parameters in 'key==value' format to be appended to the URL."),
    flags: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Additional HTTPie flags (e.g., '--json', '--form', '--verbose', '--follow', '--auth=USER:PASS')."
      ),
    print: tool.schema
      .string()
      .optional()
      .describe(
        "Specify what to print: 'H' (request headers), 'B' (request body), 'h' (response headers), 'b' (response body), 'm' (response metadata). Default is 'hb'."
      ),
  },
  async execute({ url, method, headers, data, params, flags, print }) {
    // --- Validation Patterns ---
    const HEADER_RE = /^[\w-]+:.+$/;
    const PARAM_RE = /^[^=]+==.*$/;
    const DATA_STR_RE = /^[^:=]+=[^=]*$/;
    const DATA_JSON_RE = /^[^:=]+:=.+$/;

    const httpArgs: string[] = [];

    // Always use --ignore-stdin to prevent hanging in non-interactive environments
    httpArgs.push("--ignore-stdin");

    if (print) {
      httpArgs.push(`--print=${print}`);
    }

    if (flags) {
      // Filter out flags that could be dangerous or break the TUI
      const safeFlags = flags.filter(f => !f.includes("--debug") && !f.includes("--traceback") && !f.startsWith("--json"));
      httpArgs.push(...safeFlags);
    }

    // Add -- to separate flags from positional arguments (Method, URL, Items)
    httpArgs.push("--");

    if (method) {
      httpArgs.push(method.toUpperCase());
    }

    httpArgs.push(url);

    // --- Validate and add Headers ---
    if (headers) {
      for (const h of headers) {
        if (!HEADER_RE.test(h)) {
          return `Error: Invalid header format "${h}". Expected "Name:Value".`;
        }
        if (h.includes("@")) return `Error: '@' operator is prohibited in headers. Item: "${h}"`;
        httpArgs.push(h);
      }
    }

    // --- Validate and add Data (Body) ---
    if (data) {
      for (const d of data) {
        const isJson = d.includes(":=");
        const isValid = isJson ? DATA_JSON_RE.test(d) : DATA_STR_RE.test(d);
        
        if (!isValid) {
          return `Error: Invalid data field format "${d}". Expected "key=value" for strings or "key:=value" for JSON/numbers/booleans.`;
        }
        if (d.includes("@")) return `Error: '@' operator is prohibited in data fields. Item: "${d}"`;
        httpArgs.push(d);
      }
    }

    // --- Validate and add Params (URL) ---
    if (params) {
      for (const p of params) {
        if (!PARAM_RE.test(p)) {
          return `Error: Invalid parameter format "${p}". Expected "key==value".`;
        }
        if (p.includes("@")) return `Error: '@' operator is prohibited in parameters. Item: "${p}"`;
        httpArgs.push(p);
      }
    }

    try {
      // Execute the 'http' command
      const output = execFileSync("http", httpArgs, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
        env: { ...process.env, HTTPIE_CONFIG_DIR: "/tmp" }, // Use a safe config dir
      });
      return output;
    } catch (error: any) {
      // Clean up output by removing ANSI escape codes
      const stderr = (error.stderr || error.message || "").replace(
        /\x1B\[[0-9;]*[a-zA-Z]/g,
        ""
      );
      
      // Look for common HTTPie error patterns
      if (stderr.includes("invalid JSON")) {
        return "Error: Invalid JSON provided in a data field (using ':=') or flag. Please check your syntax.";
      }
      
      if (stderr.includes("ConnectionError") || stderr.includes("Connection refused")) {
        return "Error: Could not connect to the server. Verify the URL and your network connection.";
      }

      // Attempt to extract the most relevant error message (usually the last non-empty line)
      const lines = stderr.split("\n").map(l => l.trim()).filter(Boolean);
      const lastLine = lines.find(l => l.toLowerCase().startsWith("http: error:")) || lines[lines.length - 1] || "Unknown error";

      // Return a clean error message to avoid breaking the TUI
      return `Error: ${lastLine.replace(/^http: error: /i, "")}`;
    }
  },
});
