import { describe, expect, it } from "vitest";
import { shouldMultiline } from "../src/multiline.js";

describe("shouldMultiline", () => {
  describe("Python", () => {
    it("returns true after def with colon", () => {
      const prefix = "def fibonacci(n: int) -> int:\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns true after if with colon", () => {
      const prefix = "if x > 0:\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns true after for with colon", () => {
      const prefix = "for item in items:\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns true after class with colon", () => {
      const prefix = "class MyClass:\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns true inside open triple-double-quote docstring", () => {
      const prefix = 'def foo():\n    """\n';
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns true inside open triple-single-quote docstring", () => {
      const prefix = "def foo():\n    '''\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });

    it("returns false after closed docstring", () => {
      const prefix = 'def foo():\n    """Docstring."""\n    ';
      expect(shouldMultiline(prefix, "python")).toBe(false);
    });

    it("returns false in mid-expression", () => {
      const prefix = "x = some_func(";
      expect(shouldMultiline(prefix, "python")).toBe(false);
    });

    it("returns true with colon and comment", () => {
      const prefix = "for i in range(10):  # loop\n";
      expect(shouldMultiline(prefix, "python")).toBe(true);
    });
  });

  describe("C-family (TypeScript, JavaScript, Java, etc.)", () => {
    it("returns true after opening brace", () => {
      const prefix = "function foo() {\n";
      expect(shouldMultiline(prefix, "typescript")).toBe(true);
    });

    it("returns true after arrow function brace", () => {
      const prefix = "const fn = () => {\n";
      expect(shouldMultiline(prefix, "javascript")).toBe(true);
    });

    it("returns true after if brace", () => {
      const prefix = "if (x > 0) {\n";
      expect(shouldMultiline(prefix, "java")).toBe(true);
    });

    it("returns true after class brace", () => {
      const prefix = "class Foo {\n";
      expect(shouldMultiline(prefix, "typescript")).toBe(true);
    });

    it("returns true inside open JSDoc", () => {
      const prefix = "/**\n * \n";
      expect(shouldMultiline(prefix, "typescript")).toBe(true);
    });

    it("returns false after closed JSDoc", () => {
      const prefix = "/** Docs */\nfunction foo() {\n  return 1;\n";
      expect(shouldMultiline(prefix, "typescript")).toBe(false);
    });

    it("returns false in mid-expression", () => {
      const prefix = "const x = foo(";
      expect(shouldMultiline(prefix, "typescript")).toBe(false);
    });

    it("returns false on a line with code", () => {
      const prefix = "const x = ";
      expect(shouldMultiline(prefix, "typescript")).toBe(false);
    });
  });

  describe("Go", () => {
    it("returns true after func brace", () => {
      const prefix = "func main() {\n";
      expect(shouldMultiline(prefix, "go")).toBe(true);
    });
  });

  describe("unknown language", () => {
    it("returns false for unknown language", () => {
      const prefix = "something:\n";
      expect(shouldMultiline(prefix, "plaintext")).toBe(false);
    });
  });
});
