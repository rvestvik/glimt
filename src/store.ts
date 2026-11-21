// Per-device conveniences. Storage can be unavailable (private mode, blocked
// site data), so every access is guarded and the app works without it.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export interface Filter {
  sit: string | null;
  tid: string | null;
}

export const store = {
  favoritter: new Set<number>(read<number[]>("glimt.fav", [])),
  sett: read<number[]>("glimt.sett", []),
  filter: read<Filter>("glimt.filter", { sit: null, tid: null }),

  toggleFav(nr: number): boolean {
    if (this.favoritter.has(nr)) this.favoritter.delete(nr);
    else this.favoritter.add(nr);
    write("glimt.fav", [...this.favoritter]);
    return this.favoritter.has(nr);
  },

  markSett(nr: number): void {
    this.sett = [nr, ...this.sett.filter((n) => n !== nr)].slice(0, 30);
    write("glimt.sett", this.sett);
  },

  setFilter(f: Filter): void {
    this.filter = f;
    write("glimt.filter", f);
  },
};
