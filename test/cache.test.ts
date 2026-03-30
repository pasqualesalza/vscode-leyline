import { describe, expect, it } from "vitest";
import { LruCache } from "../src/cache.js";

describe("LruCache", () => {
  it("stores and retrieves values", () => {
    const cache = new LruCache<string>(10);
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new LruCache<string>(10);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts least recently used when full", () => {
    const cache = new LruCache<string>(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3"); // evicts "a"
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  it("get promotes entry to most recently used", () => {
    const cache = new LruCache<string>(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // promotes "a"
    cache.set("c", "3"); // evicts "b" (not "a")
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("3");
  });

  it("overwrites existing key without increasing size", () => {
    const cache = new LruCache<string>(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("a", "updated");
    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBe("updated");
  });

  it("clear removes all entries", () => {
    const cache = new LruCache<string>(10);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("maxSize 0 disables caching", () => {
    const cache = new LruCache<string>(0);
    cache.set("a", "1");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("tracks size correctly", () => {
    const cache = new LruCache<string>(5);
    expect(cache.size).toBe(0);
    cache.set("a", "1");
    expect(cache.size).toBe(1);
    cache.set("b", "2");
    expect(cache.size).toBe(2);
    cache.set("a", "updated");
    expect(cache.size).toBe(2);
  });
});
