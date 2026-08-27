import { useState } from 'react';
import type { Game } from '../game/types';
import { ROLE_INFO } from '../game/types';

interface Props {
  game: Game;
  onVote: (playerId: number) => void;
  onWhiteClaim: (playerId: number) => void;
}

type Mode = 'idle' | 'vote' | 'claim';

export function Play({ game, onVote, onWhiteClaim }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [selected, setSelected] = useState<number | null>(null);

  const alive = game.players.filter((p) => p.alive);
  const ucLeft = alive.filter((p) => p.role === 'undercover').length;
  const whiteLeft = alive.filter((p) => p.role === 'white').length;
  const starter = game.players.find((p) => p.id === game.startId);
  const selectedPlayer = selected !== null ? game.players.find((p) => p.id === selected)! : null;

  function cancel() {
    setMode('idle');
    setSelected(null);
  }

  function confirm() {
    if (selected === null) return;
    const id = selected;
    const m = mode;
    cancel();
    if (m === 'vote') onVote(id);
    else onWhiteClaim(id);
  }

  return (
    <div className="screen play">
      <header className="play-header">
        <div className="play-round">Vòng {game.round}</div>
        {game.showCategory && <div className="play-category">📂 {game.category}</div>}
        <div className="play-counts">
          Còn ẩn danh: 🕵️ {ucLeft} · 🤍 {whiteLeft}
        </div>
      </header>

      {starter && (
        <div className="starter-banner">
          🎤 <b>{starter.name}</b> mô tả trước, đi tiếp theo vòng chuyền máy
        </div>
      )}

      {mode !== 'idle' && (
        <div className="mode-banner">
          {mode === 'vote' ? '🗳️ Chạm vào người bị cả nhóm vote loại' : '🤍 Chạm vào người xin đoán từ'}
        </div>
      )}

      <div className="player-grid">
        {game.players.map((p) => {
          const info = ROLE_INFO[p.role];
          return (
            <button
              key={p.id}
              className={[
                'player-tile',
                p.alive ? '' : 'is-dead',
                mode !== 'idle' && p.alive ? 'is-selectable' : '',
                p.id === game.startId && p.alive ? 'is-starter' : '',
              ].join(' ')}
              disabled={mode === 'idle' || !p.alive}
              onClick={() => setSelected(p.id)}
            >
              <span className="player-avatar">{p.alive ? '🙂' : info.icon}</span>
              <span className="player-name">{p.name}</span>
              <span className="player-sub">
                {p.alive ? `Ghế ${p.id + 1}` : info.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="play-actions">
        {mode === 'idle' ? (
          <>
            <button className="btn btn-primary" onClick={() => setMode('vote')}>
              🗳️ Vote loại
            </button>
            <button className="btn btn-white-claim" onClick={() => setMode('claim')}>
              🤍 Mũ Trắng đoán từ
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={cancel}>
            ✕ Hủy
          </button>
        )}
      </div>

      {selectedPlayer && (
        <div className="sheet-backdrop" onClick={cancel}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {mode === 'vote' ? (
              <>
                <p className="sheet-title">
                  Loại <b>{selectedPlayer.name}</b>?
                </p>
                <p className="sheet-note">Cả nhóm đã thống nhất chưa? Vai của người này sẽ bị lật.</p>
              </>
            ) : (
              <>
                <p className="sheet-title">
                  <b>{selectedPlayer.name}</b> tự nhận là Mũ Trắng?
                </p>
                <p className="sheet-note">
                  Nếu đúng là Mũ Trắng, người này phải đoán từ ngay (không hủy được). Nếu nhận vơ —
                  lộ vai và bị loại luôn!
                </p>
              </>
            )}
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={cancel}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={confirm}>
                {mode === 'vote' ? '⚡ Loại' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
