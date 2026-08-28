import { useEffect } from 'react';
import type { Game, Player } from '../game/types';
import { ROLE_INFO } from '../game/types';
import type { ScoreRow } from '../storage';
import { sfx } from '../audio';

interface Props {
  game: Game;
  /** điểm ăn được ván này, keyed theo id người chơi */
  earned: Record<number, number>;
  board: ScoreRow[];
  onPlayAgain: () => void;
  onScoreboard: () => void;
  onHome: () => void;
}

const BANNERS = {
  civilian: { icon: '😇', label: 'DÂN THƯỜNG THẮNG!', cls: 'win-civilian' },
  undercover: { icon: '🕵️', label: 'GIÁN ĐIỆP THẮNG!', cls: 'win-undercover' },
  white: { icon: '🤍', label: 'MŨ TRẮNG THẮNG!', cls: 'win-white' },
  couple: { icon: '💘', label: 'CẶP ĐÔI THẮNG!', cls: 'win-couple' },
} as const;

export function GameOver({ game, earned, board, onPlayAgain, onScoreboard, onHome }: Props) {
  const winner = game.winner ?? 'civilian';
  const banner = BANNERS[winner];
  const guesser =
    game.whiteGuesserId !== null ? game.players.find((p) => p.id === game.whiteGuesserId) : null;

  const top = [...board].sort((a, b) => b.points - a.points).slice(0, 3);

  useEffect(() => {
    if (winner === 'civilian') sfx.fanfare();
    else if (winner === 'couple') sfx.fanfareLove();
    else if (winner === 'white') {
      sfx.revealWhite();
      window.setTimeout(() => sfx.fanfareDark(), 420);
    } else sfx.fanfareDark();
  }, [winner]);

  function subtitle(p: Player): string {
    if (!p.alive) return 'Bị loại';
    return 'Sống sót';
  }

  return (
    <div className={`screen game-over ${banner.cls}`}>
      <div className="over-banner">
        <span className="over-icon">{banner.icon}</span>
        <h2>{banner.label}</h2>
        {winner === 'white' &&
          (guesser ? (
            <p>
              <b>{guesser.name}</b> đã đoán đúng từ của Dân!
            </p>
          ) : (
            <p>Mũ Trắng sống sót đến phút cuối!</p>
          ))}
        {winner === 'couple' && (
          <p>
            {game.players
              .filter((p) => p.alive && p.loverId !== null)
              .map((p) => p.name)
              .join(' 💘 ')}{' '}
            — khác phe nhưng về đích cùng nhau!
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
          const pts = earned[p.id] ?? 0;
          return (
            <div key={p.id} className={`over-row ${pts > 0 ? 'is-winner' : ''}`}>
              <span className="over-role-icon">{info.icon}</span>
              <span className="over-name">
                {p.name}
                <small> · {subtitle(p)}</small>
              </span>
              <span className="over-role" style={{ color: info.color }}>
                {p.isRevenger && '💣'}
                {p.loverId !== null && '💘'} {info.label}
              </span>
              <span className={`over-points ${pts > 0 ? 'is-scored' : ''}`}>
                {pts > 0 ? `+${pts}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {top.length > 0 && (
        <button className="card mini-board" onClick={onScoreboard}>
          <span className="mini-board-title">🏆 Dẫn đầu cả buổi</span>
          {top.map((r, i) => (
            <span key={r.name} className="mini-board-row">
              <b>{['🥇', '🥈', '🥉'][i]}</b> {r.name} · {r.points} điểm
            </span>
          ))}
          <span className="mini-board-more">Xem bảng điểm đầy đủ →</span>
        </button>
      )}

      <div className="over-actions">
        <button className="btn btn-primary btn-big" onClick={onPlayAgain}>
          🔁 Ván mới (giữ người chơi)
        </button>
        <button className="btn btn-ghost" onClick={onHome}>
          🏠 Trang chủ
        </button>
      </div>
    </div>
  );
}
