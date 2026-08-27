export type Role = 'civilian' | 'undercover' | 'white';
export type Winner = 'civilian' | 'undercover' | 'white' | 'couple';

/** Vì sao một người rời ván */
export type DeathReason = 'vote' | 'lover' | 'revenge' | 'whiteClaim' | 'whiteWrong';

export interface Death {
  playerId: number;
  reason: DeathReason;
}

export interface Player {
  id: number;
  name: string;
  role: Role;
  /** null với Mũ Trắng */
  word: string | null;
  alive: boolean;
  /** role đã bị lộ công khai (bị loại) */
  revealed: boolean;
  /** Kẻ Báo Thù — bị loại thì kéo theo một người */
  isRevenger: boolean;
  /** id người yêu, null nếu không thuộc cặp đôi */
  loverId: number | null;
}

/** Ba chức năng đặc biệt, mặc định tắt hết */
export interface SpecialRoles {
  /** Người bị loại vẫn được bàn luận và bỏ phiếu */
  ghost: boolean;
  /** Một người là Kẻ Báo Thù */
  revenger: boolean;
  /** Hai người là Cặp Đôi, chết chung */
  lovers: boolean;
}

export const NO_SPECIALS: SpecialRoles = { ghost: false, revenger: false, lovers: false };

export type SpecialKey = keyof SpecialRoles;

export const SPECIAL_INFO: Record<
  SpecialKey,
  {
    label: string;
    icon: string;
    /** 'mode' áp cho cả bàn, 'role' là vai bí mật bốc cho người cụ thể */
    kind: 'mode' | 'role';
    desc: string;
    minPlayers: number;
  }
> = {
  ghost: {
    label: 'Bóng Ma',
    icon: '👻',
    kind: 'mode',
    desc: 'Áp dụng cho CẢ BÀN, không bốc cho riêng ai: hễ ai bị loại là thành bóng ma, vẫn được bàn luận và bỏ phiếu như thường, chỉ khác là không ai vote họ được nữa.',
    minPlayers: 4,
  },
  revenger: {
    label: 'Kẻ Báo Thù',
    icon: '💣',
    kind: 'role',
    desc: 'Bốc bí mật cho MỘT người, phe nào cũng có thể trúng. Khi bị loại, người đó chỉ tay chọn một người bất kỳ đi cùng. Mỗi ván một lần.',
    minPlayers: 5,
  },
  lovers: {
    label: 'Cặp Đôi',
    icon: '💘',
    kind: 'role',
    desc: 'Bốc bí mật cho HAI người. Họ biết tên nhau lúc xem từ nhưng không biết từ hay phe của nhau. Một người bị loại thì người kia chết theo. Khác phe mà về đích hai người cuối thì thắng riêng.',
    minPlayers: 5,
  },
};

/** Điểm thưởng khi thắng, chỉnh được trong phần thiết lập */
export interface PointRules {
  civilian: number;
  undercover: number;
  white: number;
  /** Cặp Đôi khác phe sống tới cuối */
  couple: number;
}

export const DEFAULT_POINTS: PointRules = { civilian: 1, undercover: 5, white: 3, couple: 5 };

export interface GameSettings {
  civilianCount: number;
  undercoverCount: number;
  whiteCount: number;
  /** rỗng = tất cả chủ đề */
  categories: string[];
  /** hiện tên chủ đề cho cả bàn (giúp Mũ Trắng có cửa đoán) */
  showCategory: boolean;
  points: PointRules;
  specials: SpecialRoles;
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
  specials: SpecialRoles;
  /** Kẻ Báo Thù đã dùng lượt kéo theo chưa */
  revengeUsed: boolean;
  /** những Mũ Trắng đã dùng lượt đoán từ */
  whiteGuessedIds: number[];
  winner: Winner | null;
  /** Mũ Trắng thắng nhờ đoán đúng từ (null nếu thắng do sống sót) */
  whiteGuesserId: number | null;
}

export const ROLE_INFO: Record<Role, { label: string; icon: string; color: string }> = {
  civilian: { label: 'Dân Thường', icon: '😇', color: 'var(--green)' },
  undercover: { label: 'Gián Điệp', icon: '🕵️', color: 'var(--red)' },
  white: { label: 'Mũ Trắng', icon: '🤍', color: 'var(--silver)' },
};

export const DEATH_LABEL: Record<DeathReason, string> = {
  vote: 'bị cả nhóm vote loại',
  lover: 'chết theo người yêu',
  revenge: 'bị Kẻ Báo Thù kéo theo',
  whiteClaim: 'nhận vơ là Mũ Trắng',
  whiteWrong: 'đoán sai từ của Dân',
};
