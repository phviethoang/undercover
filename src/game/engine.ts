import type {
  Death,
  DeathReason,
  Game,
  GameSettings,
  PointRules,
  Player,
  Role,
  SpecialRoles,
  Winner,
} from './types';
import { SPECIAL_INFO, totalPlayers } from './types';
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
  if (s.civilianCount <= infiltrators) return 'Số Dân phải nhiều hơn tổng Gián Điệp + Mũ Trắng';
  return null;
}

/** Chức năng đặc biệt nào đủ số người để bật */
export function specialAvailable(key: keyof SpecialRoles, total: number): boolean {
  return total >= SPECIAL_INFO[key].minPlayers;
}

/** Loại bỏ những chức năng không đủ số người chơi */
export function usableSpecials(specials: SpecialRoles, total: number): SpecialRoles {
  return {
    ghost: specials.ghost && specialAvailable('ghost', total),
    revenger: specials.revenger && specialAvailable('revenger', total),
    lovers: specials.lovers && specialAvailable('lovers', total),
  };
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
  const specials = usableSpecials(settings.specials, n);

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
    isRevenger: false,
    loverId: null,
  }));

  // Kẻ Báo Thù và Cặp Đôi bốc độc lập với vai, ai cũng có thể trúng
  if (specials.revenger) {
    players[randomInt(n)].isRevenger = true;
  }
  if (specials.lovers) {
    const [a, b] = shuffle(players.map((p) => p.id)).slice(0, 2);
    players[a].loverId = b;
    players[b].loverId = a;
  }

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
    specials,
    revengeUsed: false,
    whiteGuessedIds: [],
    winner: null,
    whiteGuesserId: null,
  };
}

/**
 * Điều kiện thắng:
 * - Cặp Đôi khác phe sống tới hai người cuối cùng thì thắng riêng (đè lên mọi luật khác).
 * - Dân thắng khi loại hết Gián Điệp và Mũ Trắng.
 * - Phe ẩn danh thắng khi không còn bị Dân áp đảo. Mũ Trắng sống tới lúc đó cũng là thắng.
 */
export function checkWin(players: Player[], specials: SpecialRoles): Winner | null {
  const alive = players.filter((p) => p.alive);
  if (
    specials.lovers &&
    alive.length === 2 &&
    alive[0].loverId === alive[1].id &&
    alive[0].role !== alive[1].role
  ) {
    return 'couple';
  }
  const u = alive.filter((p) => p.role === 'undercover').length;
  const w = alive.filter((p) => p.role === 'white').length;
  const c = alive.filter((p) => p.role === 'civilian').length;
  if (u === 0 && w === 0) return 'civilian';
  if (u + w >= c) return u > 0 ? 'undercover' : 'white';
  return null;
}

/**
 * Lên danh sách người sẽ chết khi loại `playerId`, gồm cả dây chuyền Cặp Đôi.
 * Chưa đụng vào game — để màn hình lật vai từng người rồi mới áp dụng.
 */
export function planElimination(game: Game, playerId: number, reason: DeathReason): Death[] {
  const target = game.players.find((p) => p.id === playerId);
  if (!target || !target.alive) return [];
  const deaths: Death[] = [{ playerId, reason }];
  const dead = new Set<number>([playerId]);

  // người yêu chết theo; lặp phòng trường hợp dây dài (hiện chỉ 1 cặp nên tối đa 1 vòng)
  let scan = 0;
  while (scan < deaths.length) {
    const cur = game.players.find((p) => p.id === deaths[scan].playerId)!;
    const loverId = cur.loverId;
    if (game.specials.lovers && loverId !== null && !dead.has(loverId)) {
      const lover = game.players.find((p) => p.id === loverId);
      if (lover?.alive) {
        dead.add(loverId);
        deaths.push({ playerId: loverId, reason: 'lover' });
      }
    }
    scan++;
  }
  return deaths;
}

/** Đánh dấu chết. KHÔNG tính người thắng — chờ hết chuỗi báo thù / đoán từ đã. */
export function applyDeaths(game: Game, deaths: Death[]): Game {
  if (deaths.length === 0) return game;
  const ids = new Set(deaths.map((d) => d.playerId));
  return {
    ...game,
    players: game.players.map((p) => (ids.has(p.id) ? { ...p, alive: false, revealed: true } : p)),
  };
}

function nextAliveAfter(players: Player[], fromId: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const p = players[(fromId + step) % n];
    if (p.alive) return p.id;
  }
  return fromId;
}

/** Chốt vòng: tính người thắng và người mở lời vòng sau. Gọi khi chuỗi chết đã xong. */
export function finalizeRound(game: Game, lastDeadId: number | null): Game {
  const winner = checkWin(game.players, game.specials);
  return {
    ...game,
    winner,
    round: game.round + 1,
    startId:
      winner || lastDeadId === null ? game.startId : nextAliveAfter(game.players, lastDeadId),
  };
}

/** Kẻ Báo Thù vừa chết trong đợt này và chưa dùng lượt kéo theo? */
export function pendingRevenger(game: Game, deaths: Death[]): number | null {
  if (!game.specials.revenger || game.revengeUsed) return null;
  const found = deaths.find((d) => game.players.find((p) => p.id === d.playerId)?.isRevenger);
  return found ? found.playerId : null;
}

/** Mũ Trắng vừa chết mà chưa dùng lượt đoán từ */
export function pendingWhiteGuesser(game: Game, deaths: Death[]): number | null {
  const found = deaths.find((d) => {
    const p = game.players.find((x) => x.id === d.playerId);
    return p?.role === 'white' && !game.whiteGuessedIds.includes(p.id);
  });
  return found ? found.playerId : null;
}

export function markWhiteGuessed(game: Game, playerId: number): Game {
  if (game.whiteGuessedIds.includes(playerId)) return game;
  return { ...game, whiteGuessedIds: [...game.whiteGuessedIds, playerId] };
}

export function setWhiteWin(game: Game, playerId: number): Game {
  return { ...game, winner: 'white', whiteGuesserId: playerId };
}

/**
 * Điểm của từng người sau một ván.
 * Dân và Gián Điệp ăn điểm theo phe. Mũ Trắng chỉ ăn khi tự thắng.
 * Cặp Đôi khác phe về đích hai người cuối thì cả hai ăn điểm cặp đôi.
 */
export function computeRoundPoints(game: Game, rules: PointRules): Record<number, number> {
  const out: Record<number, number> = {};
  if (!game.winner) return out;

  if (game.winner === 'couple') {
    for (const p of game.players) {
      if (p.alive && p.loverId !== null) out[p.id] = rules.couple;
    }
    return out;
  }

  // Mũ Trắng đoán trúng vào lúc phe ẩn danh cũng đã thắng thế trận
  // -> Gián Điệp vẫn được điểm, không bị cú đoán cướp mất công sống sót.
  const undercoverAlsoWon =
    game.winner === 'white' &&
    game.whiteGuesserId !== null &&
    checkWin(game.players, game.specials) === 'undercover';

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
