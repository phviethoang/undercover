import type { Game, GameSettings, PointRules, Player, Role, Winner } from './types';
import { totalPlayers } from './types';
import type { Pair } from './words';

/**
 * Số nguyên ngẫu nhiên trong [0, max). Ưu tiên bộ sinh ngẫu nhiên của trình duyệt
 * và loại bỏ lệch modulo bằng rejection sampling, để việc chia vai không thiên vị ghế nào.
 */
export function randomInt(max: number): number {
  if (max <= 1) return 0;
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    // vứt bỏ phần dư ở đuôi dải 32-bit để mọi giá trị có xác suất bằng nhau
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    let v = 0;
    do {
      c.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % max;
  }
  return Math.floor(Math.random() * max);
}

/** Fisher–Yates: mỗi hoán vị có xác suất bằng nhau */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function validateSettings(s: GameSettings): string | null {
  const total = totalPlayers(s);
  const infiltrators = s.undercoverCount + s.whiteCount;
  if (total < 3) return 'Cần ít nhất 3 người chơi';
  if (total > 20) return 'Tối đa 20 người chơi';
  if (infiltrators < 1) return 'Cần ít nhất 1 Gián Điệp hoặc Mũ Trắng';
  if (s.civilianCount <= infiltrators)
    return 'Số Dân phải nhiều hơn tổng Gián Điệp + Mũ Trắng';
  return null;
}

/**
 * Cấu hình vai gợi ý theo tổng số người, dựa trên bảng chuẩn của game gốc:
 * nhóm nhỏ không có Mũ Trắng, số Mũ Trắng không bao giờ vượt số Gián Điệp.
 */
export function recommendedRoles(total: number): { undercoverCount: number; whiteCount: number } {
  if (total <= 5) return { undercoverCount: 1, whiteCount: 0 };
  if (total <= 7) return { undercoverCount: 1, whiteCount: 1 };
  if (total <= 10) return { undercoverCount: 2, whiteCount: 1 };
  if (total <= 13) return { undercoverCount: 3, whiteCount: 1 };
  if (total <= 16) return { undercoverCount: 3, whiteCount: 2 };
  return { undercoverCount: 4, whiteCount: 2 };
}

export function createGame(names: string[], settings: GameSettings, pair: Pair): Game {
  const n = names.length;
  const roles: Role[] = [];
  for (let i = 0; i < settings.undercoverCount; i++) roles.push('undercover');
  for (let i = 0; i < settings.whiteCount; i++) roles.push('white');
  while (roles.length < n) roles.push('civilian');
  const dealt = shuffle(roles);

  // random phe nào nhận từ nào để không đoán được "từ quen hơn là của dân"
  const flip = randomInt(2) === 1;
  const civilianWord = flip ? pair.b : pair.a;
  const undercoverWord = flip ? pair.a : pair.b;

  const players: Player[] = names.map((name, i) => ({
    id: i,
    name,
    role: dealt[i],
    word: dealt[i] === 'white' ? null : dealt[i] === 'civilian' ? civilianWord : undercoverWord,
    alive: true,
    revealed: false,
  }));

  // Mũ Trắng không bao giờ mở lời đầu tiên
  const candidates = players.filter((p) => p.role !== 'white');
  const start = candidates[randomInt(candidates.length)];

  return {
    players,
    startId: start.id,
    round: 1,
    pairId: pair.id,
    category: pair.c,
    civilianWord,
    undercoverWord,
    showCategory: settings.showCategory,
    points: settings.points,
    winner: null,
    whiteGuesserId: null,
  };
}

/**
 * Điều kiện thắng theo luật Undercover chuẩn:
 * - Dân thắng khi loại hết Gián Điệp và Mũ Trắng.
 * - Phe ẩn danh thắng khi không còn bị Dân áp đảo về số lượng.
 *   Mũ Trắng sống tới lúc đó cũng tính là thắng (không cần đoán từ).
 */
export function checkWin(players: Player[]): Winner | null {
  const alive = players.filter((p) => p.alive);
  const u = alive.filter((p) => p.role === 'undercover').length;
  const w = alive.filter((p) => p.role === 'white').length;
  const c = alive.filter((p) => p.role === 'civilian').length;
  if (u === 0 && w === 0) return 'civilian';
  if (u + w >= c) return u > 0 ? 'undercover' : 'white';
  return null;
}

function nextAliveAfter(players: Player[], fromId: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const p = players[(fromId + step) % n];
    if (p.alive) return p.id;
  }
  return fromId;
}

/** Loại một người chơi, tính lại phe thắng + người mở lời vòng sau */
export function eliminate(game: Game, playerId: number): Game {
  const players = game.players.map((p) =>
    p.id === playerId ? { ...p, alive: false, revealed: true } : p,
  );
  const winner = checkWin(players);
  return {
    ...game,
    players,
    winner,
    round: game.round + 1,
    startId: winner ? game.startId : nextAliveAfter(players, playerId),
  };
}

export function setWhiteWin(game: Game, playerId: number): Game {
  return { ...game, winner: 'white', whiteGuesserId: playerId };
}

/**
 * Điểm của từng người sau một ván.
 * Dân và Gián Điệp ăn điểm theo phe. Mũ Trắng chỉ ăn điểm khi tự thắng —
 * đoán trúng từ, hoặc sống sót tới lúc phe ẩn danh thắng.
 */
export function computeRoundPoints(game: Game, rules: PointRules): Record<number, number> {
  const out: Record<number, number> = {};
  if (!game.winner) return out;
  // Mũ Trắng đoán trúng vào lúc phe ẩn danh cũng đã thắng thế trận
  // -> Gián Điệp vẫn được điểm, không bị cú đoán cướp mất công sống sót.
  const undercoverAlsoWon =
    game.winner === 'white' && game.whiteGuesserId !== null && checkWin(game.players) === 'undercover';

  for (const p of game.players) {
    let pts = 0;
    if (game.winner === 'civilian') {
      if (p.role === 'civilian') pts = rules.civilian;
    } else if (game.winner === 'undercover') {
      if (p.role === 'undercover') pts = rules.undercover;
      else if (p.role === 'white' && p.alive) pts = rules.white;
    } else if (game.winner === 'white') {
      if (p.role === 'white') {
        const wonByGuess = game.whiteGuesserId === p.id;
        const wonBySurviving = game.whiteGuesserId === null && p.alive;
        if (wonByGuess || wonBySurviving) pts = rules.white;
      } else if (p.role === 'undercover' && undercoverAlsoWon) {
        pts = rules.undercover;
      }
    }
    if (pts > 0) out[p.id] = pts;
  }
  return out;
}

function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/** So khớp đoán của Mũ Trắng: bỏ hoa/thường, khoảng trắng thừa; chấp nhận gõ không dấu */
export function isCorrectGuess(guess: string, word: string): boolean {
  const g = normalize(guess);
  const w = normalize(word);
  if (!g) return false;
  return g === w || stripDiacritics(g) === stripDiacritics(w);
}
