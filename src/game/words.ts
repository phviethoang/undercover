import { WORDBANK_ENC } from '../data/wordbank.enc';
import { wordUsage } from '../storage';

export interface Pair {
  id: string;
  /** chủ đề */
  c: string;
  a: string;
  b: string;
  /** độ khó 1-3 */
  d: number;
}

// Key giải mã kho từ — kho chỉ nằm trong repo ở dạng mã hóa để không ai bị spoil
const XOR_KEY = 'gian-diep-tram-nam-moi-lo-dien';

let cache: Pair[] | null = null;

export function loadBank(): Pair[] {
  if (cache) return cache;
  const bin = atob(WORDBANK_ENC);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  }
  cache = JSON.parse(new TextDecoder().decode(bytes)) as Pair[];
  return cache;
}

export function bankStats(): { total: number; categories: { name: string; count: number }[] } {
  const bank = loadBank();
  const byCat = new Map<string, number>();
  for (const p of bank) byCat.set(p.c, (byCat.get(p.c) ?? 0) + 1);
  return {
    total: bank.length,
    categories: [...byCat.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((x, y) => x.name.localeCompare(y.name, 'vi')),
  };
}

/**
 * Bốc một cặp từ: luôn ưu tiên những cặp ĐÃ DÙNG ÍT NHẤT (không xóa cặp cũ,
 * chỉ đẩy xuống cuối hàng đợi), random trong nhóm ít dùng nhất.
 */
export function pickPair(selectedCategories: string[]): Pair {
  const bank = loadBank();
  const pool = selectedCategories.length
    ? bank.filter((p) => selectedCategories.includes(p.c))
    : bank;
  const source = pool.length ? pool : bank;
  const usage = wordUsage.load();
  let min = Infinity;
  for (const p of source) min = Math.min(min, usage[p.id] ?? 0);
  const leastUsed = source.filter((p) => (usage[p.id] ?? 0) === min);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}
