export type Role = 'civilian' | 'undercover' | 'white';
export type Winner = 'civilian' | 'undercover' | 'white';

export interface Player {
  id: number;
  name: string;
  role: Role;
  /** null với Mũ Trắng */
  word: string | null;
  alive: boolean;
  /** role đã bị lộ công khai (bị loại) */
  revealed: boolean;
}

/** Điểm thưởng khi thắng, chỉnh được trong phần thiết lập */
export interface PointRules {
  civilian: number;
  undercover: number;
  white: number;
}

export const DEFAULT_POINTS: PointRules = { civilian: 1, undercover: 3, white: 5 };
/** Thang điểm của bản Undercover quốc tế (Yanstar Studio) */
export const OFFICIAL_POINTS: PointRules = { civilian: 2, undercover: 10, white: 6 };

export interface GameSettings {
  civilianCount: number;
  undercoverCount: number;
  whiteCount: number;
  /** rỗng = tất cả chủ đề */
  categories: string[];
  /** hiện tên chủ đề cho cả bàn (giúp Mũ Trắng có cửa đoán) */
  showCategory: boolean;
  points: PointRules;
}

export function totalPlayers(s: {
  civilianCount: number;
  undercoverCount: number;
  whiteCount: number;
}): number {
  return s.civilianCount + s.undercoverCount + s.whiteCount;
}

export interface Game {
  players: Player[];
  /** id người mở lời vòng hiện tại */
  startId: number;
  round: number;
  pairId: string;
  category: string;
  civilianWord: string;
  undercoverWord: string;
  showCategory: boolean;
  points: PointRules;
  winner: Winner | null;
  /** Mũ Trắng thắng nhờ đoán đúng từ (null nếu thắng do sống sót) */
  whiteGuesserId: number | null;
}

export const ROLE_INFO: Record<Role, { label: string; icon: string; color: string }> = {
  civilian: { label: 'Dân Thường', icon: '😇', color: 'var(--green)' },
  undercover: { label: 'Gián Điệp', icon: '🕵️', color: 'var(--red)' },
  white: { label: 'Mũ Trắng', icon: '🤍', color: 'var(--silver)' },
};
