import { useState } from 'react';

interface Props {
  count: number;
  initial: string[];
  needsNames: boolean;
  onBack: () => void;
  onConfirm: (names: string[]) => void;
}

const fallback = (i: number) => `Người chơi ${i + 1}`;

export function Names({ count, initial, needsNames, onBack, onConfirm }: Props) {
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: count }, (_, i) => initial[i] ?? ''),
  );

  const filled = names.map((n, i) => n.trim() || fallback(i));
  const seen = new Map<string, number>();
  let duplicate: string | null = null;
  for (const n of filled) {
    const key = n.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if ((seen.get(key) ?? 0) > 1 && !duplicate) duplicate = n;
  }

  return (
    <div className="screen names">
      <header className="topbar">
        <button className="btn-back" onClick={onBack}>
          ←
        </button>
        <h2>Tên người chơi</h2>
      </header>

      <p className="names-hint">
        {needsNames
          ? 'Nhập theo đúng thứ tự sẽ chuyền máy. Cần có tên trước khi chia bài thì Cặp Đôi mới biết mình ghép với ai.'
          : 'Nhập theo đúng thứ tự sẽ chuyền máy. Bỏ trống thì lấy tên mặc định.'}
      </p>

      <div className="names-list">
        {names.map((n, i) => (
          <label key={i} className="names-row">
            <span className="names-index">{i + 1}</span>
            <input
              className="name-input names-input"
              value={n}
              maxLength={20}
              placeholder={fallback(i)}
              onChange={(e) => {
                const next = [...names];
                next[i] = e.target.value;
                setNames(next);
              }}
            />
          </label>
        ))}
      </div>

      {duplicate && (
        <p className="setup-summary is-error">
          Có hai người cùng tên “{duplicate}” — bảng điểm sẽ cộng nhầm vào một người. Đổi tên đi nhé.
        </p>
      )}

      <button
        className="btn btn-primary btn-big"
        disabled={!!duplicate}
        onClick={() => onConfirm(filled)}
      >
        Chia bài cho {count} người 🎴
      </button>
    </div>
  );
}
