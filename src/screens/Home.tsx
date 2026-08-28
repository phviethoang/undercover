import { useState } from 'react';
import { audioPrefs, sfx } from '../audio';

interface Props {
  stats: { total: number; categories: { name: string; count: number }[] };
  canResume: boolean;
  onResume: () => void;
  onPlay: () => void;
  onRules: () => void;
  onScoreboard: () => void;
}

export function Home({ stats, canResume, onResume, onPlay, onRules, onScoreboard }: Props) {
  const [sound, setSound] = useState(audioPrefs.sfx);
  const [music, setMusic] = useState(audioPrefs.music);

  return (
    <div className="screen home">
      <div className="home-glow" aria-hidden />
      <div className="home-hero">
        <div className="home-emoji">🕵️</div>
        <h1 className="home-title">
          UNDER
          <span>COVER</span>
        </h1>
        <p className="home-sub">Ai là gián điệp?</p>
      </div>

      <div className="home-actions">
        {canResume && (
          <button className="btn btn-ghost" onClick={onResume}>
            ⏳ Tiếp tục ván đang chơi
          </button>
        )}
        <button className="btn btn-primary btn-big" onClick={onPlay}>
          🎮 Chơi ngay
        </button>
        <div className="home-actions-row">
          <button className="btn btn-ghost" onClick={onRules}>
            📖 Luật chơi
          </button>
          <button className="btn btn-ghost" onClick={onScoreboard}>
            🏆 Bảng điểm
          </button>
        </div>
      </div>

      <div className="audio-toggles">
        <button
          className={`audio-btn ${sound ? 'is-on' : ''}`}
          data-nosound
          onClick={() => {
            const next = !sound;
            audioPrefs.setSfx(next);
            setSound(next);
            if (next) sfx.confirm();
          }}
        >
          {sound ? '🔊' : '🔇'} Hiệu ứng
        </button>
        <button
          className={`audio-btn ${music ? 'is-on' : ''}`}
          data-nosound
          onClick={() => {
            const next = !music;
            audioPrefs.setMusic(next);
            setMusic(next);
          }}
        >
          🎵 Nhạc nền
        </button>
      </div>

      <p className="home-stats">
        Kho từ: <b>{stats.total}</b> cặp · <b>{stats.categories.length}</b> chủ đề
      </p>
    </div>
  );
}
