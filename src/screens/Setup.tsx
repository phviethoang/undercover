import { useState } from 'react';
import type { GameSettings, PointRules } from '../game/types';
import { OFFICIAL_POINTS, DEFAULT_POINTS, totalPlayers } from '../game/types';
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
  hint,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">
        <span className="stepper-icon">{icon}</span>
        <span>
          {label}
          {hint && <small>{hint}</small>}
        </span>
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

const samePoints = (a: PointRules, b: PointRules) =>
  a.civilian === b.civilian && a.undercover === b.undercover && a.white === b.white;

export function Setup({ initial, categories, onBack, onStart }: Props) {
  const [s, setS] = useState<GameSettings>(initial);
  const [showPoints, setShowPoints] = useState(false);
  const error = validateSettings(s);
  const total = totalPlayers(s);

  function toggleCategory(name: string) {
    setS((prev) => ({
      ...prev,
      categories: prev.categories.includes(name)
        ? prev.categories.filter((c) => c !== name)
        : [...prev.categories, name],
    }));
  }

  function setPoints(patch: Partial<PointRules>) {
    setS((prev) => ({ ...prev, points: { ...prev.points, ...patch } }));
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
        <div className={`total-banner ${error ? 'is-error' : ''}`}>
          <span className="total-label">Tổng số người chơi</span>
          <span className="total-value">{total}</span>
          <span className="total-formula">
            {s.civilianCount} Dân + {s.undercoverCount} Gián Điệp + {s.whiteCount} Mũ Trắng
          </span>
        </div>

        <div className="card">
          <Stepper
            label="Dân Thường"
            icon="😇"
            hint="Cùng nhận một từ khóa"
            value={s.civilianCount}
            min={2}
            max={18}
            onChange={(v) => setS({ ...s, civilianCount: v })}
          />
          <Stepper
            label="Gián Điệp"
            icon="🕵️"
            hint="Nhận từ gần nghĩa"
            value={s.undercoverCount}
            min={0}
            max={8}
            onChange={(v) => setS({ ...s, undercoverCount: v })}
          />
          <Stepper
            label="Mũ Trắng"
            icon="🤍"
            hint="Không có từ nào"
            value={s.whiteCount}
            min={0}
            max={3}
            onChange={(v) => setS({ ...s, whiteCount: v })}
          />
          {error && <p className="setup-summary is-error">{error}</p>}
        </div>

        <div className="card">
          <p className="card-title">
            Chủ đề từ khóa
            <span className="card-title-note">
              {s.categories.length === 0
                ? `Tất cả ${categories.length} chủ đề`
                : `Đã chọn ${s.categories.length}/${categories.length}`}
            </span>
          </p>
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

        <div className="card">
          <button className="collapse-head" onClick={() => setShowPoints((v) => !v)}>
            <span className="card-title" style={{ marginBottom: 0 }}>
              Điểm thưởng khi thắng
            </span>
            <span className="collapse-preview">
              {s.points.civilian} / {s.points.undercover} / {s.points.white} {showPoints ? '▾' : '▸'}
            </span>
          </button>

          {showPoints && (
            <div className="collapse-body">
              <Stepper
                label="Dân thắng"
                icon="😇"
                value={s.points.civilian}
                min={0}
                max={20}
                onChange={(v) => setPoints({ civilian: v })}
              />
              <Stepper
                label="Gián Điệp thắng"
                icon="🕵️"
                value={s.points.undercover}
                min={0}
                max={20}
                onChange={(v) => setPoints({ undercover: v })}
              />
              <Stepper
                label="Mũ Trắng thắng"
                icon="🤍"
                value={s.points.white}
                min={0}
                max={20}
                onChange={(v) => setPoints({ white: v })}
              />
              <div className="preset-row">
                <button
                  className={`chip ${samePoints(s.points, DEFAULT_POINTS) ? 'is-on' : ''}`}
                  onClick={() => setPoints(DEFAULT_POINTS)}
                >
                  Mặc định 1/3/8
                </button>
                <button
                  className={`chip ${samePoints(s.points, OFFICIAL_POINTS) ? 'is-on' : ''}`}
                  onClick={() => setPoints(OFFICIAL_POINTS)}
                >
                  Bản quốc tế 2/10/6
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-primary btn-big" disabled={!!error} onClick={() => onStart(s)}>
        Chia bài cho {total} người 🎴
      </button>
    </div>
  );
}
