import { useState } from 'react';
import type { Player, Winner } from '../game/types';
import { ROLE_INFO } from '../game/types';
import { vibrate } from '../vibrate';

interface Props {
  player: Player;
  from: 'vote' | 'whiteClaim';
  winner: Winner | null;
  onContinue: () => void;
}

export function RoleReveal({ player, from, winner, onContinue }: Props) {
  const [flipped, setFlipped] = useState(false);
  const info = ROLE_INFO[player.role];

  const continueLabel = winner
    ? 'Xem kết quả 🏁'
    : from === 'vote' && player.role === 'white'
      ? 'Mũ Trắng được đoán từ! 🎯'
      : 'Vòng tiếp theo ➡️';

  return (
    <div className="screen role-reveal">
      <h2 className="role-reveal-title">
        {from === 'whiteClaim' ? `${player.name} nhận là Mũ Trắng...` : `${player.name} bị loại!`}
      </h2>

      <div
        className={`flip ${flipped ? 'is-flipped' : ''}`}
        onClick={() => {
          if (!flipped) {
            setFlipped(true);
            vibrate([40, 60, 80]);
          }
        }}
      >
        <div className="flip-inner">
          <div className="flip-front">
            <span className="flip-q">?</span>
            <span>Chạm để lật vai</span>
          </div>
          <div className="flip-back" style={{ ['--role-color' as string]: info.color }}>
            <span className="flip-icon">{info.icon}</span>
            <span className="flip-role">{info.label}</span>
            <span className="flip-name">{player.name}</span>
            {from === 'whiteClaim' && player.role !== 'white' && (
              <span className="flip-note">Nhận vơ! Bị loại khỏi ván 💀</span>
            )}
          </div>
        </div>
      </div>

      <button className={`btn btn-primary btn-big ${flipped ? '' : 'is-hidden'}`} onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  );
}
