export class LruCache<V> {
  private readonly map = new Map<string, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = Math.max(0, Math.trunc(maxSize));
  }

  get(key: string): V | undefined {
    if (this.maxSize <= 0) return undefined;
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.maxSize <= 0) return;
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict the least recently used (first entry)
      const first = this.map.keys().next().value as string;
      this.map.delete(first);
    }
    this.map.set(key, value);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
