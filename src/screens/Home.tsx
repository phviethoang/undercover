interface Props {
  stats: { total: number; categories: { name: string; count: number }[] };
  canResume: boolean;
  hasScores: boolean;
  onResume: () => void;
  onPlay: () => void;
  onRules: () => void;
  onScoreboard: () => void;
}

export function Home({
  stats,
  canResume,
  hasScores,
  onResume,
  onPlay,
  onRules,
  onScoreboard,
}: Props) {
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
            🏆 Bảng điểm{hasScores ? '' : ''}
          </button>
        </div>
      </div>

      <p className="home-stats">
        Kho từ: <b>{stats.total}</b> cặp · <b>{stats.categories.length}</b> chủ đề
      </p>
    </div>
  );
}
