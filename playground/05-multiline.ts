import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface AppConfig {
  host: string;
  port: number;
  debug: boolean;
}

function loadConfig(path: string): AppConfig {
  const config =

  if (!existsSync(path)) {
    return config;
  }

  const raw = readFileSync(path, "utf-8");
  const overrides = JSON.parse(raw) as Partial<AppConfig>;
  return { ...config, ...overrides };
}

const cfg = loadConfig(join(__dirname, "config.json"));
console.log(`Server starting on ${cfg.host}:${cfg.port}`);
