import { useState } from 'react';
import type { Player } from '../game/types';

interface Props {
  revenger: Player;
  players: Player[];
  onPick: (victimId: number) => void;
  onSkip: () => void;
}

export function RevengePick({ revenger, players, onPick, onSkip }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const targets = players.filter((p) => p.alive);
  const victim = selected !== null ? players.find((p) => p.id === selected)! : null;

  if (targets.length === 0) {
    return (
      <div className="screen revenge">
        <div className="result-emoji">💣</div>
        <h2>{revenger.name} là Kẻ Báo Thù!</h2>
        <p className="guess-hint">Nhưng chẳng còn ai để kéo theo nữa...</p>
        <button className="btn btn-primary btn-big" onClick={onSkip}>
          Tiếp tục ➡️
        </button>
      </div>
    );
  }

  return (
    <div className="screen revenge">
      <div className="revenge-head">
        <div className="result-emoji">💣</div>
        <h2>{revenger.name} là Kẻ Báo Thù!</h2>
        <p className="guess-hint">
          Trước khi rời bàn, <b>{revenger.name}</b> chỉ tay chọn một người đi cùng. Chọn xong là
          không đổi được.
        </p>
      </div>

      <div className="player-grid revenge-grid">
        {targets.map((p) => (
          <button
            key={p.id}
            className={`player-tile is-selectable ${selected === p.id ? 'is-picked' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <span className="player-avatar">🙂</span>
            <span className="player-name">{p.name}</span>
            <span className="player-sub">Ghế {p.id + 1}</span>
          </button>
        ))}
      </div>

      <div className="over-actions">
        <button className="btn btn-danger btn-big" disabled={!victim} onClick={() => victim && onPick(victim.id)}>
          {victim ? `💥 Kéo theo ${victim.name}` : 'Chọn một người'}
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          Tha cho tất cả
        </button>
      </div>
    </div>
  );
}
