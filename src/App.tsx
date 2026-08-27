import { useEffect, useRef, useState } from 'react';
import type { Death, Game, GameSettings } from './game/types';
import { DEFAULT_POINTS, NO_SPECIALS, totalPlayers } from './game/types';
import {
  applyDeaths,
  computeRoundPoints,
  createGame,
  finalizeRound,
  isCorrectGuess,
  markWhiteGuessed,
  pendingRevenger,
  pendingWhiteGuesser,
  planElimination,
  setWhiteWin,
} from './game/engine';
import { bankStats, pickPair } from './game/words';
import { savedNames, savedSettings, scoreboard, session, wordUsage } from './storage';
import type { ScoreRow } from './storage';
import { Home } from './screens/Home';
import { Rules } from './screens/Rules';
import { Setup } from './screens/Setup';
import { Reveal } from './screens/Reveal';
import { Play } from './screens/Play';
import { DeathReveal } from './screens/DeathReveal';
import { RevengePick } from './screens/RevengePick';
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
  /** lật vai lần lượt từng người vừa chết trong một đợt */
  | { name: 'deathReveal'; deaths: Death[]; index: number }
  | { name: 'revengePick'; revengerId: number; chain: Death[] }
  | { name: 'whiteGuess'; playerId: number; context: 'eliminated' | 'volunteer'; chain: Death[] }
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
  specials: NO_SPECIALS,
};

const ACTIVE_SCREENS = ['reveal', 'play', 'deathReveal', 'revengePick', 'whiteGuess'];

/** Cài đặt lưu từ bản cũ có thể thiếu trường mới — vá lại để không vỡ app */
function normalizeSettings(raw: Partial<GameSettings> & { playerCount?: number }): GameSettings {
  const undercoverCount = raw.undercoverCount ?? DEFAULT_SETTINGS.undercoverCount;
  const whiteCount = raw.whiteCount ?? DEFAULT_SETTINGS.whiteCount;
  const civilianCount =
    raw.civilianCount ??
    (raw.playerCount
      ? Math.max(2, raw.playerCount - undercoverCount - whiteCount)
      : DEFAULT_SETTINGS.civilianCount);
  return {
    civilianCount,
    undercoverCount,
    whiteCount,
    categories: raw.categories ?? [],
    showCategory: raw.showCategory ?? true,
    points: { ...DEFAULT_POINTS, ...(raw.points ?? {}) },
    specials: { ...NO_SPECIALS, ...(raw.specials ?? {}) },
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
  const stats = useRef(bankStats());
  /** chặn cộng điểm hai lần nếu quay lại màn kết thúc */
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

  /**
   * Sau khi đã lật vai xong một đợt chết, quyết định bước tiếp theo:
   * Mũ Trắng đoán từ → Kẻ Báo Thù kéo người → chốt vòng.
   */
  function resolveChain(g: Game, chain: Death[]) {
    const whiteId = pendingWhiteGuesser(g, chain);
    if (whiteId !== null) {
      setScreen({ name: 'whiteGuess', playerId: whiteId, context: 'eliminated', chain });
      return;
    }
    const revengerId = pendingRevenger(g, chain);
    if (revengerId !== null) {
      setScreen({ name: 'revengePick', revengerId, chain });
      return;
    }
    const lastDead = chain.length ? chain[chain.length - 1].playerId : null;
    const done = finalizeRound(g, lastDead);
    setGame(done);
    if (done.winner) finishGame(done);
    else setScreen({ name: 'play' });
  }

  /** Bắt đầu một đợt loại người: tính dây chuyền, đánh dấu chết, mở màn lật vai */
  function beginElimination(g: Game, playerId: number, reason: Death['reason']) {
    const deaths = planElimination(g, playerId, reason);
    if (deaths.length === 0) {
      resolveChain(g, []);
      return;
    }
    const next = applyDeaths(g, deaths);
    setGame(next);
    setScreen({ name: 'deathReveal', deaths, index: 0 });
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
    beginElimination(game, playerId, 'vote');
  }

  function whiteClaim(playerId: number) {
    if (!game) return;
    const p = game.players.find((x) => x.id === playerId)!;
    if (p.role === 'white') {
      setScreen({ name: 'whiteGuess', playerId, context: 'volunteer', chain: [] });
    } else {
      // nhận vơ Mũ Trắng -> lộ vai và bị loại
      beginElimination(game, playerId, 'whiteClaim');
    }
  }

  function submitWhiteGuess(guess: string): boolean {
    if (!game || screen.name !== 'whiteGuess') return false;
    const correct = isCorrectGuess(guess, game.civilianWord);
    const marked = markWhiteGuessed(game, screen.playerId);
    if (correct) {
      const won = setWhiteWin(marked, screen.playerId);
      setGame(won);
    } else {
      setGame(marked);
    }
    return correct;
  }

  /** Bấm tiếp sau khi Mũ Trắng đoán xong */
  function afterWhiteGuess(correct: boolean) {
    if (!game || screen.name !== 'whiteGuess') return;
    if (correct) {
      finishGame(game);
      return;
    }
    if (screen.context === 'volunteer') {
      // đoán hụt khi tự nhận -> bị loại, kéo theo dây chuyền như thường
      beginElimination(game, screen.playerId, 'whiteWrong');
    } else {
      resolveChain(game, screen.chain);
    }
  }

  function doRevenge(victimId: number) {
    if (!game || screen.name !== 'revengePick') return;
    const used: Game = { ...game, revengeUsed: true };
    beginElimination(used, victimId, 'revenge');
  }

  switch (screen.name) {
    case 'home':
      return (
        <Home
          stats={stats.current}
          canResume={resumable !== null}
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
          players={game.players}
          index={screen.index}
          total={game.players.length}
          onDone={(name) => finishRevealTurn(screen.index, name)}
        />
      );
    }
    case 'play':
      if (!game) return null;
      return <Play game={game} onVote={voteOut} onWhiteClaim={whiteClaim} />;
    case 'deathReveal': {
      if (!game) return null;
      const death = screen.deaths[screen.index];
      const p = game.players.find((x) => x.id === death.playerId)!;
      const isLast = screen.index + 1 >= screen.deaths.length;
      return (
        <DeathReveal
          key={`${game.round}-${death.playerId}`}
          player={p}
          death={death}
          step={screen.index + 1}
          total={screen.deaths.length}
          onContinue={() => {
            if (isLast) resolveChain(game, screen.deaths);
            else setScreen({ ...screen, index: screen.index + 1 });
          }}
        />
      );
    }
    case 'revengePick': {
      if (!game) return null;
      const revenger = game.players.find((x) => x.id === screen.revengerId)!;
      return (
        <RevengePick
          revenger={revenger}
          players={game.players}
          onPick={doRevenge}
          onSkip={() => {
            const skipped: Game = { ...game, revengeUsed: true };
            setGame(skipped);
            resolveChain(skipped, screen.chain);
          }}
        />
      );
    }
    case 'whiteGuess': {
      if (!game) return null;
      const p = game.players.find((x) => x.id === screen.playerId)!;
      return (
        <WhiteGuess
          key={`${game.round}-${p.id}`}
          playerName={p.name}
          context={screen.context}
          onSubmit={submitWhiteGuess}
          onFinish={afterWhiteGuess}
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
