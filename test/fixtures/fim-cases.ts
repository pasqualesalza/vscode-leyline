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
