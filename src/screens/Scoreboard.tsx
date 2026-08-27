import { useState } from 'react';
import type { ScoreRow } from '../storage';

interface Props {
  board: ScoreRow[];
  onReset: () => void;
  onBack: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Scoreboard({ board, onReset, onBack }: Props) {
  const [confirming, setConfirming] = useState(false);
  const rows = [...board].sort((a, b) => b.points - a.points || b.wins - a.wins);
  const totalGames = rows.reduce((max, r) => Math.max(max, r.games), 0);

  return (
    <div className="screen scoreboard">
      <header className="topbar">
        <button className="btn-back" onClick={onBack}>
          ←
        </button>
        <h2>Bảng điểm</h2>
      </header>

      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏆</span>
          <p>Chưa có ván nào được ghi điểm.</p>
          <p className="empty-note">Chơi xong một ván là điểm tự cộng vào đây.</p>
        </div>
      ) : (
        <>
          <p className="board-sub">Đã chơi {totalGames} ván trong buổi này</p>
          <div className="card board-list">
            {rows.map((r, i) => (
              <div key={r.name} className={`board-row ${i === 0 ? 'is-first' : ''}`}>
                <span className="board-rank">{MEDALS[i] ?? i + 1}</span>
                <span className="board-name">{r.name}</span>
                <span className="board-meta">
                  {r.wins}/{r.games} ván thắng
                </span>
                <span className="board-points">{r.points}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="over-actions">
        <button className="btn btn-primary btn-big" onClick={onBack}>
          Quay lại
        </button>
        {rows.length > 0 &&
          (confirming ? (
            <div className="over-actions-row">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Hủy
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                Xóa hết điểm
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
              🗑️ Bắt đầu buổi mới (xóa điểm)
            </button>
          ))}
      </div>
    </div>
  );
}
