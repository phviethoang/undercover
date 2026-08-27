import { useState } from 'react';
import type { GameSettings } from '../game/types';
import { validateSettings } from '../game/engine';

interface Props {
  initial: GameSettings;
  categories: { name: string; count: number }[];
  onBack: () => void;
  onStart: (s: GameSettings) => void;
}

function Stepper({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">
        <span className="stepper-icon">{icon}</span>
        {label}
      </span>
      <div className="stepper-controls">
        <button
          className="stepper-btn"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Giảm ${label}`}
        >
          −
        </button>
        <span className="stepper-value">{value}</span>
        <button
          className="stepper-btn"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Tăng ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Setup({ initial, categories, onBack, onStart }: Props) {
  const [s, setS] = useState<GameSettings>(initial);
  const error = validateSettings(s);
  const civilians = s.playerCount - s.undercoverCount - s.whiteCount;

  function toggleCategory(name: string) {
    setS((prev) => ({
      ...prev,
      categories: prev.categories.includes(name)
        ? prev.categories.filter((c) => c !== name)
        : [...prev.categories, name],
    }));
  }

  return (
    <div className="screen setup">
      <header className="topbar">
        <button className="btn-back" onClick={onBack}>
          ←
        </button>
        <h2>Thiết lập ván</h2>
      </header>

      <div className="setup-body">
        <div className="card">
          <Stepper
            label="Người chơi"
            icon="👥"
            value={s.playerCount}
            min={3}
            max={20}
            onChange={(v) => setS({ ...s, playerCount: v })}
          />
          <Stepper
            label="Gián Điệp"
            icon="🕵️"
            value={s.undercoverCount}
            min={0}
            max={8}
            onChange={(v) => setS({ ...s, undercoverCount: v })}
          />
          <Stepper
            label="Mũ Trắng"
            icon="🤍"
            value={s.whiteCount}
            min={0}
            max={3}
            onChange={(v) => setS({ ...s, whiteCount: v })}
          />
          <p className={`setup-summary ${error ? 'is-error' : ''}`}>
            {error ?? `😇 ${civilians} Dân · 🕵️ ${s.undercoverCount} Gián Điệp · 🤍 ${s.whiteCount} Mũ Trắng`}
          </p>
        </div>

        <div className="card">
          <p className="card-title">Chủ đề từ khóa</p>
          <div className="chips">
            <button
              className={`chip ${s.categories.length === 0 ? 'is-on' : ''}`}
              onClick={() => setS({ ...s, categories: [] })}
            >
              ✨ Tất cả
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                className={`chip ${s.categories.includes(c.name) ? 'is-on' : ''}`}
                onClick={() => toggleCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <label className="toggle-row">
            <span>
              Hiện chủ đề cho cả bàn
              <small>Gợi ý duy nhất giúp Mũ Trắng có cửa đoán từ</small>
            </span>
            <input
              type="checkbox"
              checked={s.showCategory}
              onChange={(e) => setS({ ...s, showCategory: e.target.checked })}
            />
            <span className="toggle-ui" />
          </label>
        </div>
      </div>

      <button className="btn btn-primary btn-big" disabled={!!error} onClick={() => onStart(s)}>
        Chia bài 🎴
      </button>
    </div>
  );
}
