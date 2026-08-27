import type { Game, Player } from '../game/types';
import { ROLE_INFO } from '../game/types';

interface Props {
  game: Game;
  onPlayAgain: () => void;
  onNewSetup: () => void;
  onHome: () => void;
}

const BANNERS = {
  civilian: { icon: '😇', label: 'DÂN THƯỜNG THẮNG!', cls: 'win-civilian' },
  undercover: { icon: '🕵️', label: 'GIÁN ĐIỆP THẮNG!', cls: 'win-undercover' },
  white: { icon: '🤍', label: 'MŨ TRẮNG THẮNG!', cls: 'win-white' },
} as const;

export function GameOver({ game, onPlayAgain, onNewSetup, onHome }: Props) {
  const winner = game.winner ?? 'civilian';
  const banner = BANNERS[winner];

  function isWinner(p: Player): boolean {
    if (winner === 'white') return p.role === 'white' && p.name === game.whiteWinnerName;
    return p.role === winner;
  }

  return (
    <div className={`screen game-over ${banner.cls}`}>
      <div className="over-banner">
        <span className="over-icon">{banner.icon}</span>
        <h2>{banner.label}</h2>
        {winner === 'white' && game.whiteWinnerName && (
          <p>
            <b>{game.whiteWinnerName}</b> đã đoán đúng từ của Dân!
          </p>
        )}
      </div>

      <div className="card words-card">
        {game.showCategory && <p className="words-cat">📂 {game.category}</p>}
        <div className="words-row">
          <div>
            <span className="words-label">😇 Từ của Dân</span>
            <span className="words-value">{game.civilianWord}</span>
          </div>
          <div>
            <span className="words-label">🕵️ Từ của Gián Điệp</span>
            <span className="words-value">{game.undercoverWord}</span>
          </div>
        </div>
      </div>

      <div className="card over-list">
        {game.players.map((p) => {
          const info = ROLE_INFO[p.role];
          return (
            <div key={p.id} className={`over-row ${isWinner(p) ? 'is-winner' : ''}`}>
              <span className="over-role-icon">{info.icon}</span>
              <span className="over-name">
                {p.name}
                {!p.alive && <small> 💀</small>}
              </span>
              <span className="over-role" style={{ color: info.color }}>
                {info.label}
              </span>
              {isWinner(p) && <span className="over-trophy">🏆</span>}
            </div>
          );
        })}
      </div>

      <div className="over-actions">
        <button className="btn btn-primary btn-big" onClick={onPlayAgain}>
          🔁 Ván mới (giữ người chơi)
        </button>
        <div className="over-actions-row">
          <button className="btn btn-ghost" onClick={onNewSetup}>
            ⚙️ Đổi thiết lập
          </button>
          <button className="btn btn-ghost" onClick={onHome}>
            🏠 Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
