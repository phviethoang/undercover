import { useState } from 'react';
import type { GameSettings, PointRules, SpecialKey } from '../game/types';
import { SPECIAL_INFO, totalPlayers } from '../game/types';
import { recommendedRoles, specialAvailable, validateSettings } from '../game/engine';

const SPECIAL_KEYS: SpecialKey[] = ['ghost', 'revenger', 'lovers'];

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

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;

/** Cấu hình chuẩn cho một tổng số người */
function standardFor(total: number): {
  civilianCount: number;
  undercoverCount: number;
  whiteCount: number;
} {
  const rec = recommendedRoles(total);
  return {
    civilianCount: total - rec.undercoverCount - rec.whiteCount,
    undercoverCount: rec.undercoverCount,
    whiteCount: rec.whiteCount,
  };
}

export function Setup({ initial, categories, onBack, onStart }: Props) {
  const [s, setS] = useState<GameSettings>(initial);
  const [showPoints, setShowPoints] = useState(false);
  const [showSpecials, setShowSpecials] = useState(false);
  const initialRec = recommendedRoles(totalPlayers(initial));
  const [manual, setManual] = useState(
    initial.undercoverCount !== initialRec.undercoverCount ||
      initial.whiteCount !== initialRec.whiteCount,
  );

  const error = validateSettings(s);
  const total = totalPlayers(s);

  /** Đổi tổng số người: ở chế độ tự động thì chia lại vai theo bảng chuẩn */
  function setTotal(next: number) {
    const clamped = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, next));
    setS((prev) => {
      if (!manual) return { ...prev, ...standardFor(clamped) };
      const civ = clamped - prev.undercoverCount - prev.whiteCount;
      return { ...prev, civilianCount: Math.max(0, civ) };
    });
  }

  function setManualMode(on: boolean) {
    setManual(on);
    // tắt chỉnh tay -> quay về cấu hình chuẩn, giữ nguyên tổng số người
    if (!on) setS((prev) => ({ ...prev, ...standardFor(totalPlayers(prev)) }));
  }

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

  function toggleSpecial(key: SpecialKey) {
    setS((prev) => ({ ...prev, specials: { ...prev.specials, [key]: !prev.specials[key] } }));
  }

  const activeSpecials = SPECIAL_KEYS.filter(
    (k) => s.specials[k] && specialAvailable(k, total),
  );

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
          <div className="total-controls">
            <button
              className="stepper-btn"
              disabled={total <= MIN_PLAYERS}
              onClick={() => setTotal(total - 1)}
              aria-label="Bớt một người"
            >
              −
            </button>
            <span className="total-value">{total}</span>
            <button
              className="stepper-btn"
              disabled={total >= MAX_PLAYERS}
              onClick={() => setTotal(total + 1)}
              aria-label="Thêm một người"
            >
              +
            </button>
          </div>
          <span className="total-formula">
            😇 {s.civilianCount} Dân · 🕵️ {s.undercoverCount} Gián Điệp · 🤍 {s.whiteCount} Mũ Trắng
          </span>
          {!manual && <span className="total-badge">✅ Cấu hình chuẩn</span>}
          {activeSpecials.length > 0 && (
            <span className="active-specials">
              {activeSpecials.map((k) => (
                <span key={k} className="special-badge">
                  {SPECIAL_INFO[k].icon} {SPECIAL_INFO[k].label}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className="card">
          <label className="toggle-row">
            <span>
              Tự chỉnh số vai
              <small>
                {manual
                  ? 'Bạn đang tự chia. Tắt để quay về cấu hình chuẩn.'
                  : 'Đang dùng tỉ lệ chuẩn theo số người chơi'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => setManualMode(e.target.checked)}
            />
            <span className="toggle-ui" />
          </label>

          {manual && (
            <div className="collapse-body">
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
          )}
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
          <button className="collapse-head" onClick={() => setShowSpecials((v) => !v)}>
            <span className="card-title" style={{ marginBottom: 0 }}>
              Chức năng đặc biệt
            </span>
            <span className="collapse-preview">
              {activeSpecials.length === 0 ? 'Tắt hết' : `Bật ${activeSpecials.length}`}{' '}
              {showSpecials ? '▾' : '▸'}
            </span>
          </button>

          {showSpecials && (
            <div className="collapse-body">
              {SPECIAL_KEYS.map((key, i) => {
                const info = SPECIAL_INFO[key];
                const available = specialAvailable(key, total);
                const prevKind = i > 0 ? SPECIAL_INFO[SPECIAL_KEYS[i - 1]].kind : null;
                const heading =
                  info.kind !== prevKind
                    ? info.kind === 'mode'
                      ? 'Chế độ — áp cho cả bàn'
                      : 'Vai bí mật — bốc cho người cụ thể'
                    : null;
                return (
                  <div key={key}>
                    {heading && <p className="special-group">{heading}</p>}
                    <label className={`toggle-row special-row ${available ? '' : 'is-locked'}`}>
                      <span>
                        {info.icon} {info.label}
                        <small>
                          {available
                            ? info.desc
                            : `Cần ít nhất ${info.minPlayers} người chơi mới bật được`}
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        disabled={!available}
                        checked={s.specials[key] && available}
                        onChange={() => toggleSpecial(key)}
                      />
                      <span className="toggle-ui" />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <button className="collapse-head" onClick={() => setShowPoints((v) => !v)}>
            <span className="card-title" style={{ marginBottom: 0 }}>
              Điểm thưởng khi thắng
            </span>
            <span className="collapse-preview">
              😇{s.points.civilian} 🕵️{s.points.undercover} 🤍{s.points.white} {showPoints ? '▾' : '▸'}
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
              {activeSpecials.includes('lovers') && (
                <Stepper
                  label="Cặp Đôi thắng"
                  icon="💘"
                  hint="Khác phe, về đích hai người cuối"
                  value={s.points.couple}
                  min={0}
                  max={20}
                  onChange={(v) => setPoints({ couple: v })}
                />
              )}
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
