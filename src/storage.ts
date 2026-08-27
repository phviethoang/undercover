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
  // đổi khóa khi mặc định thay đổi -> máy cũ nhận lại cấu hình + thang điểm mới
  settings: 'uc.settings.v2',
  usage: 'uc.usage',
  session: 'uc.session',
  scores: 'uc.scores',
};

export interface ScoreRow {
  name: string;
  points: number;
  games: number;
  wins: number;
}

/** Bảng điểm tích lũy cả buổi chơi, cộng dồn theo tên người chơi */
export const scoreboard = {
  load: (): ScoreRow[] => get<ScoreRow[]>(K.scores, []),
  /** @param earned điểm từng người ăn được ván này, keyed theo tên */
  add(playerNames: string[], earned: Record<string, number>) {
    const rows = scoreboard.load();
    const byName = new Map(rows.map((r) => [r.name, r]));
    for (const name of playerNames) {
      const row = byName.get(name) ?? { name, points: 0, games: 0, wins: 0 };
      const pts = earned[name] ?? 0;
      row.points += pts;
      row.games += 1;
      if (pts > 0) row.wins += 1;
      byName.set(name, row);
    }
    set(K.scores, [...byName.values()]);
  },
  reset: () => remove(K.scores),
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
