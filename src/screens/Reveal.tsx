import { useState } from 'react';
import type { Player } from '../game/types';
import { vibrate } from '../vibrate';
import { sfx } from '../audio';

interface Props {
  player: Player;
  players: Player[];
  index: number;
  total: number;
  onDone: () => void;
}

export function Reveal({ player, players, index, total, onDone }: Props) {
  const [step, setStep] = useState<'pass' | 'card'>('pass');
  const [holding, setHolding] = useState(false);
  const [viewed, setViewed] = useState(false);

  if (step === 'pass') {
    return (
      <div className="screen pass">
        <p className="pass-count">
          {index + 1} / {total}
        </p>
        <div className="pass-emoji">📲</div>
        <h2 className="pass-title">Chuyền máy cho {player.name}</h2>
        <p className="pass-hint">Không để ai khác nhìn màn hình tiếp theo nhé!</p>
        <button className="btn btn-primary btn-big" onClick={() => setStep('card')}>
          Tôi là {player.name} 🙋
        </button>
      </div>
    );
  }

  const isWhite = player.word === null;
  const lover = player.loverId !== null ? players.find((p) => p.id === player.loverId) : null;

  const specialNotes =
    lover || player.isRevenger ? (
      <div className="special-notes">
        {lover && (
          <span className="special-note">
            💘 Bạn là <b>Cặp Đôi</b> với <b>{lover.name}</b> — người ấy chết thì bạn chết theo. Bạn
            không biết từ của người ấy.
          </span>
        )}
        {player.isRevenger && (
          <span className="special-note">
            💣 Bạn là <b>Kẻ Báo Thù</b> — bị loại thì được kéo theo một người bất kỳ.
          </span>
        )}
      </div>
    ) : null;

  return (
    <div className="screen reveal">
      <p className="pass-count">
        {index + 1} / {total}
      </p>
      <p className="reveal-name">{player.name}</p>

      <div
        className={`word-card ${holding ? 'is-open' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          setHolding(true);
          if (!viewed) vibrate(30);
          // cố ý dùng CHUNG một tiếng cho mọi vai: cả bàn ngồi cạnh sẽ nghe thấy
          sfx.peek();
          setViewed(true);
        }}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {holding ? (
          isWhite ? (
            <div className="word-card-white">
              <span className="word-card-icon">🤍</span>
              <span className="word-card-word">Bạn là MŨ TRẮNG</span>
              <span className="word-card-note">
                Bạn không có từ khóa. Nghe mọi người mô tả, giả vờ hòa nhập và đoán từ của Dân — đoán
                đúng là thắng ngay!
              </span>
              {specialNotes}
            </div>
          ) : (
            <div className="word-card-open">
              <span className="word-card-label">Từ của bạn</span>
              <span className="word-card-word">{player.word}</span>
              {specialNotes}
            </div>
          )
        ) : (
          <div className="word-card-closed">
            <span className="word-card-icon">🎴</span>
            <span>{viewed ? 'Giữ để xem lại' : 'Giữ để xem từ'}</span>
            <span className="word-card-note">Thả tay ra là ẩn ngay</span>
          </div>
        )}
      </div>

      <button
        className="btn btn-primary btn-big"
        disabled={!viewed || holding}
        onClick={onDone}
      >
        {viewed ? (index + 1 >= total ? 'Xong — Bắt đầu chơi! 🚀' : 'Xong, chuyền máy ➡️') : 'Hãy xem từ trước đã'}
      </button>
    </div>
  );
}
