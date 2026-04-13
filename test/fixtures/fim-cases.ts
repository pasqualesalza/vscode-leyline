export interface FimTestCase {
  name: string;
  language: string;
  prefix: string;
  suffix: string;
  llmOutput: string;
  expected: string;
}

// ---------------------------------------------------------------------------
// Character-level overlap cases (stripOverlap)
// ---------------------------------------------------------------------------

export const charOverlapCases: FimTestCase[] = [
  // TypeScript
  {
    name: "TS — closing brace after fibonacci",
    language: "typescript",
    prefix:
      "function fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return ",
    suffix: "\n}",
    llmOutput: "fibonacci(n - 1) + fibonacci(n - 2);\n}",
    expected: "fibonacci(n - 1) + fibonacci(n - 2);",
  },
  {
    name: "TS — multi-line overlap with trailing code",
    language: "typescript",
    prefix: "function greet(name: string): string {\n  return ",
    suffix: "\n}\n\nconsole.log(greeting);",
    llmOutput: "name.toUpperCase();\n}\n\nconsole.log(greeting);",
    expected: "name.toUpperCase();",
  },
  {
    name: "TS — single character overlap (semicolon)",
    language: "typescript",
    prefix: "const x = ",
    suffix: ";",
    llmOutput: "42;",
    expected: "42",
  },

  // Python
  {
    name: "Python — trailing newline overlap",
    language: "python",
    prefix: "def fib(n):\n    if n <= 1:\n        return n\n    return ",
    suffix: "\n\nprint(fib(10))",
    llmOutput: "fib(n - 1) + fib(n - 2)\n\nprint(fib(10))",
    expected: "fib(n - 1) + fib(n - 2)",
  },
  {
    name: "Python — overlap with function definition",
    language: "python",
    prefix: "def square(x):\n    return ",
    suffix: "\n\ndef cube(x):",
    llmOutput: "x * x\n\ndef cube(x):",
    expected: "x * x",
  },
  {
    name: "Python — list comprehension closing bracket",
    language: "python",
    prefix: "squares = [",
    suffix: "]\nprint(squares)",
    llmOutput: "x**2 for x in range(10)]",
    expected: "x**2 for x in range(10)",
  },

  // Go
  {
    name: "Go — closing brace after return",
    language: "go",
    prefix:
      "func fibonacci(n int) int {\n\tif n <= 1 {\n\t\treturn n\n\t}\n\treturn ",
    suffix: "\n}\n\nfunc main() {",
    llmOutput: "fibonacci(n-1) + fibonacci(n-2)\n}\n\nfunc main() {",
    expected: "fibonacci(n-1) + fibonacci(n-2)",
  },
  {
    name: "Go — partial brace overlap",
    language: "go",
    prefix: "func add(a, b int) int {\n\treturn ",
    suffix: "\n}",
    llmOutput: "a + b\n}",
    expected: "a + b",
  },

  // Rust
  {
    name: "Rust — closing brace after expression",
    language: "rust",
    prefix:
      "fn fibonacci(n: u64) -> u64 {\n    if n <= 1 {\n        return n;\n    }\n    ",
    suffix: '\n}\n\nfn main() {\n    println!("{}", fibonacci(10));\n}',
    llmOutput:
      'fibonacci(n - 1) + fibonacci(n - 2)\n}\n\nfn main() {\n    println!("{}", fibonacci(10));\n}',
    expected: "fibonacci(n - 1) + fibonacci(n - 2)",
  },
  {
    name: "Rust — semicolon + brace overlap",
    language: "rust",
    prefix: "fn square(x: i32) -> i32 {\n    ",
    suffix: "\n}",
    llmOutput: "x * x\n}",
    expected: "x * x",
  },

  // Java
  {
    name: "Java — closing brace after return",
    language: "java",
    prefix:
      "public class Math {\n  public int add(int a, int b) {\n    return ",
    suffix: "\n  }\n\n  public int sub(int a, int b) {",
    llmOutput: "a + b;\n  }\n\n  public int sub(int a, int b) {",
    expected: "a + b;",
  },
  {
    name: "Java — multi-line method overlap",
    language: "java",
    prefix: "public String greet(String name) {\n    return ",
    suffix:
      '\n  }\n\n  public void log() {\n    System.out.println("done");\n  }',
    llmOutput:
      '"Hello, " + name;\n  }\n\n  public void log() {\n    System.out.println("done");\n  }',
    expected: '"Hello, " + name;',
  },

  // C
  {
    name: "C — closing brace after return",
    language: "c",
    prefix: "int square(int x) {\n    return ",
    suffix: "\n}\n\nint main() {",
    llmOutput: "x * x;\n}\n\nint main() {",
    expected: "x * x;",
  },
];

// ---------------------------------------------------------------------------
// Line-level overlap cases (stripDuplicateLines)
// ---------------------------------------------------------------------------

export const lineOverlapCases: FimTestCase[] = [
  // TypeScript
  {
    name: "TS — closing brace with different indentation",
    language: "typescript",
    prefix: "function abs(x: number): number {\n  if (x >= 0) {\n    return ",
    suffix: "\n  }\n}\n",
    llmOutput: "x;\n}",
    expected: "x;",
  },
  {
    name: "TS — else branch overlap",
    language: "typescript",
    prefix: "function sign(x: number): string {\n  if (x > 0) {\n    return ",
    suffix: '\n  } else {\n    return "negative";\n  }\n}',
    llmOutput: '"positive";\n} else {',
    expected: '"positive";',
  },
  {
    name: "TS — class method closing braces",
    language: "typescript",
    prefix:
      "class Calculator {\n  add(a: number, b: number): number {\n    return ",
    suffix: "\n  }\n\n  subtract(a: number, b: number): number {",
    llmOutput: "a + b;\n  }",
    expected: "a + b;",
  },

  // Python
  {
    name: "Python — return line duplicated",
    language: "python",
    prefix: "def process(x):\n    if x > 0:\n        x = x + 1\n        ",
    suffix: "\n    return x\n\ndef main():",
    llmOutput: "x = x * 2\n    return x",
    expected: "x = x * 2",
  },
  {
    name: "Python — def line duplicated with different spacing",
    language: "python",
    prefix: "def square(x):\n    return ",
    suffix: "\n\ndef cube(x):\n    return x ** 3",
    llmOutput: "x ** 2\ndef cube(x):",
    expected: "x ** 2",
  },

  // Go
  {
    name: "Go — closing brace with tab vs spaces",
    language: "go",
    prefix: "func abs(n int) int {\n\tif n >= 0 {\n\t\treturn ",
    suffix: "\n}\n\nfunc main() {",
    llmOutput: "n\n}",
    expected: "n",
  },
  {
    name: "Go — multi-brace closure",
    language: "go",
    prefix: "func nested() int {\n\tif true {\n\t\tif true {\n\t\t\treturn ",
    suffix: "\n\t}\n\treturn 0\n}",
    llmOutput: "1\n\t}",
    expected: "1",
  },

  // Rust
  {
    name: "Rust — closing brace line match",
    language: "rust",
    prefix: "fn abs(n: i32) -> i32 {\n    if n >= 0 {\n        return ",
    suffix: "\n}\n\nfn main() {",
    llmOutput: "n;\n}",
    expected: "n;",
  },
  {
    name: "Rust — match arm closure",
    language: "rust",
    prefix:
      "fn describe(n: i32) -> &'static str {\n    match n {\n        0 => ",
    suffix: '\n        _ => "other",\n    }\n}',
    llmOutput: '"zero",\n        _ => "other",',
    expected: '"zero",',
  },

  // Java
  {
    name: "Java — method closing brace",
    language: "java",
    prefix:
      "public class Calc {\n  public int add(int a, int b) {\n    return ",
    suffix: "\n  }\n\n  public int sub(int a, int b) {",
    llmOutput: "a + b;\n  }",
    expected: "a + b;",
  },
  {
    name: "Java — nested if closing",
    language: "java",
    prefix: "public int abs(int x) {\n    if (x >= 0) {\n      return ",
    suffix: "\n    }\n    return -x;\n  }",
    llmOutput: "x;\n    }",
    expected: "x;",
  },

  // C
  {
    name: "C — closing brace line overlap",
    language: "c",
    prefix: "int abs(int x) {\n    if (x >= 0) return ",
    suffix: "\n}\n\nint main() {",
    llmOutput: "x;\n}",
    expected: "x;",
  },
];

// ---------------------------------------------------------------------------
// No-overlap cases (completion should remain unchanged)
// ---------------------------------------------------------------------------

export const noOverlapCases: FimTestCase[] = [
  {
    name: "TS — no overlap with different suffix",
    language: "typescript",
    prefix: "const x = ",
    suffix: "\nconsole.log(y);",
    llmOutput: "42;",
    expected: "42;",
  },
  {
    name: "TS — empty suffix",
    language: "typescript",
    prefix: "const x = ",
    suffix: "",
    llmOutput: "42;",
    expected: "42;",
  },
  {
    name: "TS — empty completion",
    language: "typescript",
    prefix: "const x = ",
    suffix: "\n}",
    llmOutput: "",
    expected: "",
  },
  {
    name: "Python — no overlap with unrelated suffix",
    language: "python",
    prefix: "x = ",
    suffix: "\nprint(y)",
    llmOutput: "42",
    expected: "42",
  },
  {
    name: "Go — no overlap",
    language: "go",
    prefix: "x := ",
    suffix: "\nfmt.Println(y)",
    llmOutput: "42",
    expected: "42",
  },
  {
    name: "Rust — no overlap",
    language: "rust",
    prefix: "let x = ",
    suffix: "\nprintln!(y);",
    llmOutput: "42;",
    expected: "42;",
  },
  {
    name: "Java — no overlap",
    language: "java",
    prefix: "int x = ",
    suffix: "\nSystem.out.println(y);",
    llmOutput: "42;",
    expected: "42;",
  },
  {
    name: "TS — similar but non-matching lines",
    language: "typescript",
    prefix: "function foo() {\n  return ",
    suffix: "\n  }\n}",
    llmOutput: "bar();",
    expected: "bar();",
  },
  {
    name: "Python — completion with newline but no suffix match",
    language: "python",
    prefix: "def foo():\n    return ",
    suffix: "\n\ndef bar():",
    llmOutput: "42\n# end of foo",
    expected: "42\n# end of foo",
  },
  {
    name: "C — no overlap with struct suffix",
    language: "c",
    prefix: "int x = ",
    suffix: "\nstruct Point { int x; };",
    llmOutput: "100;",
    expected: "100;",
  },
];

// ---------------------------------------------------------------------------
// Cross-file context cases
// Prefix includes context from other files (// File: ...) prepended
// before the actual current-file code. Verifies post-processing
// handles this correctly without breaking the context headers.
// ---------------------------------------------------------------------------

export const crossFileContextCases: FimTestCase[] = [
  {
    name: "TS — cross-file context, uses imported type",
    language: "typescript",
    prefix: [
      "// File: src/types.ts",
      "export interface User { id: number; name: string; active: boolean; }",
      "",
      "// File: src/utils.ts",
      "export function getActiveUsers(users: User[]): User[] {",
      "",
      'import { User } from "./types";',
      'import { getActiveUsers } from "./utils";',
      "",
      "const users: User[] = [];",
      "const active = ",
    ].join("\n"),
    suffix: "\nconsole.log(active);",
    llmOutput: "getActiveUsers(users);\nconsole.log(active);",
    expected: "getActiveUsers(users);",
  },
  {
    name: "TS — cross-file context, no overlap with context header",
    language: "typescript",
    prefix: [
      "// File: src/config.ts",
      "export interface Config { host: string; port: number; }",
      "",
      'import { Config } from "./config";',
      "",
      "function loadConfig(): Config {",
      "  return ",
    ].join("\n"),
    suffix: "\n}",
    llmOutput: '{ host: "localhost", port: 3000 };\n}',
    expected: '{ host: "localhost", port: 3000 };',
  },
  {
    name: "Python — cross-file context with imports",
    language: "python",
    prefix: [
      "# File: models.py",
      "class User:",
      "    def __init__(self, name: str, role: str):",
      "",
      "# File: utils.py",
      "def format_user(user: User) -> str:",
      "",
      "from models import User",
      "from utils import format_user",
      "",
      "users = [User('Alice', 'admin')]",
      "formatted = ",
    ].join("\n"),
    suffix: "\nprint(formatted)",
    llmOutput: "format_user(users[0])\nprint(formatted)",
    expected: "format_user(users[0])",
  },
  {
    name: "TS — cross-file context, empty completion",
    language: "typescript",
    prefix: [
      "// File: src/types.ts",
      "export interface User { id: number; }",
      "",
      "const x = ",
    ].join("\n"),
    suffix: "\n}",
    llmOutput: "",
    expected: "",
  },
  {
    name: "Go — cross-file context with package functions",
    language: "go",
    prefix: [
      "// File: utils.go",
      "package main",
      "func FormatName(name string) string {",
      "",
      "package main",
      "",
      "func main() {",
      "  name := FormatName(",
    ].join("\n"),
    suffix: ")\n  fmt.Println(name)\n}",
    llmOutput: '"World")\n  fmt.Println(name)\n}',
    expected: '"World"',
  },
  {
    name: "Java — cross-file context with class from another file",
    language: "java",
    prefix: [
      "// File: User.java",
      "public class User {",
      "  public String name;",
      "  public boolean active;",
      "}",
      "",
      "import java.util.List;",
      "",
      "public class UserService {",
      "  public List<User> getActive(List<User> users) {",
      "    return ",
    ].join("\n"),
    suffix: "\n  }\n}",
    llmOutput: "users.stream().filter(u -> u.active).toList();\n  }\n}",
    expected: "users.stream().filter(u -> u.active).toList();",
  },
  {
    name: "Rust — cross-file context with struct and impl",
    language: "rust",
    prefix: [
      "// File: types.rs",
      "pub struct Config {",
      "  pub host: String,",
      "  pub port: u16,",
      "}",
      "",
      "use crate::types::Config;",
      "",
      "fn default_config() -> Config {",
      "  Config {",
      "    host: ",
    ].join("\n"),
    suffix: ",\n    port: 8080,\n  }\n}",
    llmOutput: '"localhost".to_string(),\n    port: 8080,\n  }\n}',
    expected: '"localhost".to_string()',
  },
  {
    name: "C — cross-file context with struct from header",
    language: "c",
    prefix: [
      "// File: point.h",
      "typedef struct { int x; int y; } Point;",
      "Point point_new(int x, int y);",
      "",
      '#include "point.h"',
      "",
      "Point point_new(int x, int y) {",
      "  return ",
    ].join("\n"),
    suffix: "\n}",
    llmOutput: "(Point){ .x = x, .y = y };\n}",
    expected: "(Point){ .x = x, .y = y };",
  },
  {
    name: "TypeScript — cross-file context, multiple files",
    language: "typescript",
    prefix: [
      "// File: src/logger.ts",
      "export interface Logger { info(msg: string): void; warn(msg: string): void; }",
      "",
      "// File: src/db.ts",
      "export interface DbConnection { query(sql: string): Promise<unknown[]>; }",
      "",
      "// File: src/config.ts (recently edited)",
      "export const DEFAULT_PORT = 3000;",
      "",
      'import { Logger } from "./logger";',
      'import { DbConnection } from "./db";',
      'import { DEFAULT_PORT } from "./config";',
      "",
      "function startServer(logger: Logger, db: DbConnection) {",
      "  logger.info(",
    ].join("\n"),
    suffix: ");\n}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal content
    llmOutput: "`Starting server on port ${DEFAULT_PORT}`);\n}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal content
    expected: "`Starting server on port ${DEFAULT_PORT}`",
  },
];
