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

export interface GameSettings {
  playerCount: number;
  undercoverCount: number;
  whiteCount: number;
  /** rỗng = tất cả chủ đề */
  categories: string[];
  /** hiện tên chủ đề cho cả bàn (giúp Mũ Trắng có cửa đoán) */
  showCategory: boolean;
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
  winner: Winner | null;
  /** tên Mũ Trắng thắng nhờ đoán đúng từ */
  whiteWinnerName: string | null;
}

export const ROLE_INFO: Record<Role, { label: string; icon: string; color: string }> = {
  civilian: { label: 'Dân Thường', icon: '😇', color: 'var(--green)' },
  undercover: { label: 'Gián Điệp', icon: '🕵️', color: 'var(--red)' },
  white: { label: 'Mũ Trắng', icon: '🤍', color: 'var(--silver)' },
};
