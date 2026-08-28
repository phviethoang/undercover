import { useState } from 'react';
import type { Death, Player } from '../game/types';
import { DEATH_LABEL, ROLE_INFO } from '../game/types';
import { vibrate } from '../vibrate';
import { sfx } from '../audio';

interface Props {
  player: Player;
  death: Death;
  step: number;
  total: number;
  onContinue: () => void;
}

const HEADLINE: Record<Death['reason'], (name: string) => string> = {
  vote: (n) => `${n} bị loại!`,
  lover: (n) => `💔 ${n} chết theo người yêu`,
  revenge: (n) => `💣 ${n} bị kéo theo`,
  whiteClaim: (n) => `${n} nhận là Mũ Trắng...`,
  whiteWrong: (n) => `${n} đoán trượt`,
};

export function DeathReveal({ player, death, step, total, onContinue }: Props) {
  const [flipped, setFlipped] = useState(false);
  const info = ROLE_INFO[player.role];

  return (
    <div className="screen role-reveal">
      {total > 1 && (
        <p className="pass-count">
          {step} / {total}
        </p>
      )}
      <h2 className="role-reveal-title">{HEADLINE[death.reason](player.name)}</h2>

      <div
        className={`flip ${flipped ? 'is-flipped' : ''}`}
        onClick={() => {
          if (!flipped) {
            setFlipped(true);
            vibrate([40, 60, 80]);
            sfx.flip();
            if (death.reason === 'lover' || death.reason === 'revenge') sfx.thud();
            // để tiếng vai rơi đúng lúc thẻ quay tới mặt trước
            window.setTimeout(() => {
              if (player.role === 'undercover') sfx.revealUndercover();
              else if (player.role === 'white') sfx.revealWhite();
              else sfx.revealCivilian();
            }, 330);
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
            <span className="flip-reason">{DEATH_LABEL[death.reason]}</span>
            {(player.isRevenger || player.loverId !== null) && (
              <span className="flip-tags">
                {player.isRevenger && <span className="tag tag-revenger">💣 Kẻ Báo Thù</span>}
                {player.loverId !== null && <span className="tag tag-lover">💘 Cặp Đôi</span>}
              </span>
            )}
            {death.reason === 'whiteClaim' && player.role !== 'white' && (
              <span className="flip-note">Nhận vơ! Bị loại khỏi ván 💀</span>
            )}
          </div>
        </div>
      </div>

      <button
        className={`btn btn-primary btn-big ${flipped ? '' : 'is-hidden'}`}
        onClick={onContinue}
      >
        {step < total ? 'Tiếp theo ➡️' : 'Tiếp tục ➡️'}
      </button>
    </div>
  );
}
