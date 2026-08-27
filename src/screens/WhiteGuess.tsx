import { useState } from 'react';
import { vibrate } from '../vibrate';

interface Props {
  playerName: string;
  context: 'eliminated' | 'volunteer';
  /** trả về true nếu đoán đúng */
  onSubmit: (guess: string) => boolean;
  onFinish: () => void;
}

export function WhiteGuess({ playerName, context, onSubmit, onFinish }: Props) {
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  function submit() {
    if (!guess.trim()) return;
    const ok = onSubmit(guess);
    setResult(ok ? 'correct' : 'wrong');
    vibrate(ok ? [60, 40, 60, 40, 120] : 200);
  }

  if (result === 'correct') {
    return (
      <div className="screen white-guess result-correct">
        <div className="result-emoji">🎉</div>
        <h2>CHÍNH XÁC!</h2>
        <p className="result-word">“{guess.trim()}”</p>
        <p>
          <b>{playerName}</b> — Mũ Trắng — đã đoán đúng từ của Dân!
        </p>
        <button className="btn btn-primary btn-big" onClick={onFinish}>
          Xem kết quả 🏁
        </button>
      </div>
    );
  }

  if (result === 'wrong') {
    return (
      <div className="screen white-guess result-wrong">
        <div className="result-emoji">💀</div>
        <h2>Sai rồi!</h2>
        <p>
          {context === 'volunteer'
            ? `${playerName} đoán trượt và bị loại khỏi ván.`
            : `${playerName} không nắm được cơ hội cuối cùng.`}
        </p>
        <p className="result-note">Từ của Dân vẫn là bí mật... 🤫</p>
        <button className="btn btn-primary btn-big" onClick={onFinish}>
          Tiếp tục ➡️
        </button>
      </div>
    );
  }

  return (
    <div className="screen white-guess">
      <div className="result-emoji">🤍</div>
      <h2>{playerName} đoán từ của Dân</h2>
      <p className="guess-hint">
        {context === 'eliminated'
          ? 'Cơ hội cuối trước khi rời bàn — đoán đúng là thắng cả ván!'
          : 'Đoán đúng thắng ngay. Đoán sai bị loại. Không quay đầu được nữa!'}
      </p>
      <input
        className="name-input guess-input"
        value={guess}
        placeholder="Nhập từ khóa của Dân..."
        maxLength={40}
        autoFocus
        onChange={(e) => setGuess(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button className="btn btn-danger btn-big" disabled={!guess.trim()} onClick={submit}>
        Chốt đáp án 🎯
      </button>
    </div>
  );
}
