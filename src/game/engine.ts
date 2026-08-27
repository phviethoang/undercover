import type { Game, GameSettings, Player, Role, Winner } from './types';
import type { Pair } from './words';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function validateSettings(s: GameSettings): string | null {
  const civ = s.playerCount - s.undercoverCount - s.whiteCount;
  if (s.playerCount < 3) return 'Cần ít nhất 3 người chơi';
  if (s.undercoverCount + s.whiteCount < 1) return 'Cần ít nhất 1 Gián Điệp hoặc Mũ Trắng';
  if (civ <= s.undercoverCount + s.whiteCount)
    return 'Số Dân phải nhiều hơn tổng Gián Điệp + Mũ Trắng';
  return null;
}

export function createGame(names: string[], settings: GameSettings, pair: Pair): Game {
  const n = names.length;
  const roles: Role[] = [];
  for (let i = 0; i < settings.undercoverCount; i++) roles.push('undercover');
  for (let i = 0; i < settings.whiteCount; i++) roles.push('white');
  while (roles.length < n) roles.push('civilian');
  const dealt = shuffle(roles);

  // random phe nào nhận từ nào để không đoán được "từ quen hơn là của dân"
  const flip = Math.random() < 0.5;
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
  const start = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    players,
    startId: start.id,
    round: 1,
    pairId: pair.id,
    category: pair.c,
    civilianWord,
    undercoverWord,
    showCategory: settings.showCategory,
    winner: null,
    whiteWinnerName: null,
  };
}

export function checkWin(players: Player[]): Winner | null {
  const alive = players.filter((p) => p.alive);
  const u = alive.filter((p) => p.role === 'undercover').length;
  const w = alive.filter((p) => p.role === 'white').length;
  const c = alive.filter((p) => p.role === 'civilian').length;
  if (u === 0 && w === 0) return 'civilian';
  if (u > 0 && u >= c + w) return 'undercover';
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

export function setWhiteWin(game: Game, playerName: string): Game {
  return { ...game, winner: 'white', whiteWinnerName: playerName };
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
