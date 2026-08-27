import { useEffect, useRef, useState } from 'react';
import type { Game, GameSettings } from './game/types';
import { DEFAULT_POINTS, totalPlayers } from './game/types';
import { computeRoundPoints, createGame, eliminate, isCorrectGuess, setWhiteWin } from './game/engine';
import { bankStats, pickPair } from './game/words';
import { savedNames, savedSettings, scoreboard, session, wordUsage } from './storage';
import type { ScoreRow } from './storage';
import { Home } from './screens/Home';
import { Rules } from './screens/Rules';
import { Setup } from './screens/Setup';
import { Reveal } from './screens/Reveal';
import { Play } from './screens/Play';
import { RoleReveal } from './screens/RoleReveal';
import { WhiteGuess } from './screens/WhiteGuess';
import { GameOver } from './screens/GameOver';
import { Scoreboard } from './screens/Scoreboard';

export type Screen =
  | { name: 'home' }
  | { name: 'rules' }
  | { name: 'scoreboard'; from: 'home' | 'gameOver' }
  | { name: 'setup' }
  | { name: 'reveal'; index: number }
  | { name: 'play' }
  | { name: 'roleReveal'; playerId: number; from: 'vote' | 'whiteClaim' }
  | { name: 'whiteGuess'; playerId: number; context: 'eliminated' | 'volunteer' }
  | { name: 'gameOver' };

interface Snapshot {
  screen: Screen;
  game: Game;
  settings: GameSettings;
}

const DEFAULT_SETTINGS: GameSettings = {
  civilianCount: 4,
  undercoverCount: 1,
  whiteCount: 1,
  categories: [],
  showCategory: true,
  points: DEFAULT_POINTS,
};

const ACTIVE_SCREENS = ['reveal', 'play', 'roleReveal', 'whiteGuess'];

/** Cài đặt lưu từ bản cũ có thể thiếu trường mới — vá lại để không vỡ app */
function normalizeSettings(raw: Partial<GameSettings> & { playerCount?: number }): GameSettings {
  const undercoverCount = raw.undercoverCount ?? DEFAULT_SETTINGS.undercoverCount;
  const whiteCount = raw.whiteCount ?? DEFAULT_SETTINGS.whiteCount;
  const civilianCount =
    raw.civilianCount ??
    (raw.playerCount ? Math.max(2, raw.playerCount - undercoverCount - whiteCount) : DEFAULT_SETTINGS.civilianCount);
  return {
    civilianCount,
    undercoverCount,
    whiteCount,
    categories: raw.categories ?? [],
    showCategory: raw.showCategory ?? true,
    points: { ...DEFAULT_POINTS, ...(raw.points ?? {}) },
  };
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() =>
    normalizeSettings(savedSettings.load<Partial<GameSettings>>(DEFAULT_SETTINGS)),
  );
  const [game, setGame] = useState<Game | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [board, setBoard] = useState<ScoreRow[]>(() => scoreboard.load());
  const [earned, setEarned] = useState<Record<number, number>>({});
  const [resumable, setResumable] = useState<Snapshot | null>(() => {
    const snap = session.load<Snapshot>();
    return snap && snap.game && ACTIVE_SCREENS.includes(snap.screen.name) ? snap : null;
  });
  const afterGuess = useRef<Screen>({ name: 'play' });
  const stats = useRef(bankStats());
  /** chặn cộng điểm hai lần nếu người dùng quay lại màn kết thúc */
  const scoredRound = useRef<string | null>(null);

  // tự lưu ván đang chơi để lỡ reload / khóa máy không mất
  useEffect(() => {
    if (game && ACTIVE_SCREENS.includes(screen.name)) {
      session.save({ screen, game, settings } satisfies Snapshot);
    } else if (screen.name === 'gameOver') {
      session.clear();
    }
  }, [screen, game, settings]);

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (ACTIVE_SCREENS.includes(screen.name)) e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [screen.name]);

  /** Chốt điểm một ván vào bảng tích lũy (chỉ chạy một lần cho mỗi ván) */
  function finishGame(finished: Game) {
    const roundKey = `${finished.pairId}-${finished.round}`;
    const points = computeRoundPoints(finished, finished.points);
    setEarned(points);
    if (scoredRound.current !== roundKey) {
      scoredRound.current = roundKey;
      const byName: Record<string, number> = {};
      for (const p of finished.players) {
        if (points[p.id]) byName[p.name] = (byName[p.name] ?? 0) + points[p.id];
      }
      scoreboard.add(
        finished.players.map((p) => p.name),
        byName,
      );
      setBoard(scoreboard.load());
    }
    setScreen({ name: 'gameOver' });
  }

  function startGame(s: GameSettings) {
    setSettings(s);
    savedSettings.save(s);
    const pair = pickPair(s.categories);
    wordUsage.markUsed(pair.id);
    const saved = savedNames.load();
    const names = Array.from(
      { length: totalPlayers(s) },
      (_, i) => saved[i]?.trim() || `Người chơi ${i + 1}`,
    );
    setGame(createGame(names, s, pair));
    setScreen({ name: 'reveal', index: 0 });
  }

  function playAgain() {
    if (!game) return;
    const names = game.players.map((p) => p.name);
    const pair = pickPair(settings.categories);
    wordUsage.markUsed(pair.id);
    setGame(createGame(names, settings, pair));
    setScreen({ name: 'reveal', index: 0 });
  }

  function finishRevealTurn(index: number, name: string) {
    if (!game) return;
    const players = game.players.map((p) => (p.id === index ? { ...p, name } : p));
    const next = { ...game, players };
    setGame(next);
    if (index + 1 >= players.length) {
      savedNames.save(players.map((p) => p.name));
      setScreen({ name: 'play' });
    } else {
      setScreen({ name: 'reveal', index: index + 1 });
    }
  }

  function voteOut(playerId: number) {
    if (!game) return;
    setGame(eliminate(game, playerId));
    setScreen({ name: 'roleReveal', playerId, from: 'vote' });
  }

  function whiteClaim(playerId: number) {
    if (!game) return;
    const p = game.players.find((x) => x.id === playerId)!;
    if (p.role === 'white') {
      setScreen({ name: 'whiteGuess', playerId, context: 'volunteer' });
    } else {
      // nhận vơ Mũ Trắng -> lộ vai và bị loại
      setGame(eliminate(game, playerId));
      setScreen({ name: 'roleReveal', playerId, from: 'whiteClaim' });
    }
  }

  function continueAfterReveal() {
    if (!game || screen.name !== 'roleReveal') return;
    const p = game.players.find((x) => x.id === screen.playerId)!;
    if (screen.from === 'vote' && p.role === 'white') {
      // Luật chuẩn: Mũ Trắng bị vote loại luôn được một lần đoán, kể cả khi ván đã ngã ngũ
      setScreen({ name: 'whiteGuess', playerId: p.id, context: 'eliminated' });
    } else if (game.winner) {
      finishGame(game);
    } else {
      setScreen({ name: 'play' });
    }
  }

  function submitWhiteGuess(guess: string): boolean {
    if (!game || screen.name !== 'whiteGuess') return false;
    const p = game.players.find((x) => x.id === screen.playerId)!;
    const correct = isCorrectGuess(guess, game.civilianWord);
    const next = correct
      ? setWhiteWin(game, p.id)
      : screen.context === 'volunteer'
        ? eliminate(game, screen.playerId)
        : game; // context 'eliminated': đã bị loại từ trước, giữ nguyên
    setGame(next);
    afterGuess.current = next.winner ? { name: 'gameOver' } : { name: 'play' };
    return correct;
  }

  function afterGuessDone() {
    if (afterGuess.current.name === 'gameOver' && game) finishGame(game);
    else setScreen(afterGuess.current);
  }

  switch (screen.name) {
    case 'home':
      return (
        <Home
          stats={stats.current}
          canResume={resumable !== null}
          hasScores={board.length > 0}
          onResume={() => {
            if (!resumable) return;
            setSettings(normalizeSettings(resumable.settings));
            setGame(resumable.game);
            setScreen(resumable.screen);
            setResumable(null);
          }}
          onPlay={() => setScreen({ name: 'setup' })}
          onRules={() => setScreen({ name: 'rules' })}
          onScoreboard={() => setScreen({ name: 'scoreboard', from: 'home' })}
        />
      );
    case 'rules':
      return <Rules points={settings.points} onBack={() => setScreen({ name: 'home' })} />;
    case 'scoreboard':
      return (
        <Scoreboard
          board={board}
          onReset={() => {
            scoreboard.reset();
            setBoard([]);
          }}
          onBack={() => setScreen(screen.from === 'home' ? { name: 'home' } : { name: 'gameOver' })}
        />
      );
    case 'setup':
      return (
        <Setup
          initial={settings}
          categories={stats.current.categories}
          onBack={() => setScreen({ name: 'home' })}
          onStart={startGame}
        />
      );
    case 'reveal': {
      if (!game) return null;
      const p = game.players[screen.index];
      return (
        <Reveal
          key={`${game.pairId}-${p.id}`}
          player={p}
          index={screen.index}
          total={game.players.length}
          onDone={(name) => finishRevealTurn(screen.index, name)}
        />
      );
    }
    case 'play':
      if (!game) return null;
      return <Play game={game} onVote={voteOut} onWhiteClaim={whiteClaim} />;
    case 'roleReveal': {
      if (!game) return null;
      const p = game.players.find((x) => x.id === screen.playerId)!;
      return (
        <RoleReveal
          key={`${game.round}-${p.id}`}
          player={p}
          from={screen.from}
          winner={game.winner}
          onContinue={continueAfterReveal}
        />
      );
    }
    case 'whiteGuess': {
      if (!game) return null;
      const p = game.players.find((x) => x.id === screen.playerId)!;
      return (
        <WhiteGuess
          key={p.id}
          playerName={p.name}
          context={screen.context}
          onSubmit={submitWhiteGuess}
          onFinish={afterGuessDone}
        />
      );
    }
    case 'gameOver':
      if (!game) return null;
      return (
        <GameOver
          game={game}
          earned={earned}
          board={board}
          onPlayAgain={playAgain}
          onScoreboard={() => setScreen({ name: 'scoreboard', from: 'gameOver' })}
          onHome={() => {
            setGame(null);
            setScreen({ name: 'home' });
          }}
        />
      );
  }
}
