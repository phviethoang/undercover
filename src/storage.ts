function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — bỏ qua */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const K = {
  names: 'uc.names',
  settings: 'uc.settings',
  usage: 'uc.usage',
  session: 'uc.session',
};

export const savedNames = {
  load: (): string[] => get<string[]>(K.names, []),
  save: (names: string[]) => set(K.names, names),
};

export const savedSettings = {
  load: <T>(fallback: T): T => get<T>(K.settings, fallback),
  save: (s: unknown) => set(K.settings, s),
};

/** Số lần mỗi cặp từ đã được dùng — không xóa, chỉ đẩy xuống ưu tiên cuối */
export const wordUsage = {
  load: (): Record<string, number> => get<Record<string, number>>(K.usage, {}),
  markUsed(pairId: string) {
    const u = wordUsage.load();
    u[pairId] = (u[pairId] ?? 0) + 1;
    set(K.usage, u);
  },
};

/** Ván đang chơi dở — để lỡ tay reload / khóa màn hình không mất ván */
export const session = {
  load: <T>(): T | null => get<T | null>(K.session, null),
  save: (snapshot: unknown) => set(K.session, snapshot),
  clear: () => remove(K.session),
};
