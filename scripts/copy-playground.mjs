import { cpSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const src = join(root, "playground");
const dest = join(root, ".leyline-playground");

if (existsSync(dest)) {
  rmSync(dest, { recursive: true });
}
cpSync(src, dest, { recursive: true });

console.log(`Playground copied to ${dest}`);
