/**
 * Âm thanh của game, tổng hợp trực tiếp bằng Web Audio API.
 * Không dùng file mp3 nào: app vẫn chạy offline, bundle không phình,
 * và mỗi hiệu ứng chỉnh được sắc thái theo tình huống.
 */

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicOn = false;

const K_SFX = 'uc.sfx';
const K_MUSIC = 'uc.music';

function readFlag(key: string, dflt: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? dflt : v === '1';
  } catch {
    return dflt;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* chế độ riêng tư — bỏ qua */
  }
}

let sfxEnabled = readFlag(K_SFX, true);
let musicEnabled = readFlag(K_MUSIC, false);

export const audioPrefs = {
  get sfx() {
    return sfxEnabled;
  },
  get music() {
    return musicEnabled;
  },
  setSfx(on: boolean) {
    sfxEnabled = on;
    writeFlag(K_SFX, on);
  },
  setMusic(on: boolean) {
    musicEnabled = on;
    writeFlag(K_MUSIC, on);
    if (on) startMusic();
    else stopMusic();
  },
};

/** Trình duyệt chỉ cho tạo tiếng sau một thao tác thật của người dùng */
function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && musicEnabled && !musicOn) startMusic();
}

interface ToneOpts {
  freq: number;
  /** giây, tính từ lúc gọi */
  at?: number;
  dur?: number;
  wave?: Wave;
  gain?: number;
  /** trượt tới tần số này */
  slideTo?: number;
  /** lọc bớt cao tần cho tiếng mềm lại */
  cutoff?: number;
}

function tone(o: ToneOpts) {
  const c = ensureCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.18;
  const peak = o.gain ?? 0.2;

  const osc = c.createOscillator();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.25));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node: AudioNode = osc;
  if (o.cutoff) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.cutoff;
    osc.connect(f);
    node = f;
  }
  node.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Tiếng ồn trắng lọc dải — dùng cho tiếng lật bài, tiếng nổ */
function noise(at: number, dur: number, cutoff: number, gain = 0.14, sweepTo?: number) {
  const c = ensureCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(cutoff, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  f.Q.value = 0.8;

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.15);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(f);
  f.connect(env);
  env.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function guard(): boolean {
  if (!sfxEnabled) return false;
  return ensureCtx() !== null;
}

export const sfx = {
  /** chạm nút thường */
  tap() {
    if (!guard()) return;
    tone({ freq: 520, dur: 0.06, wave: 'triangle', gain: 0.1, cutoff: 2200 });
  },
  /** nút chính, dứt khoát hơn */
  confirm() {
    if (!guard()) return;
    tone({ freq: 480, dur: 0.09, wave: 'triangle', gain: 0.14 });
    tone({ freq: 720, at: 0.06, dur: 0.11, wave: 'triangle', gain: 0.12 });
  },
  back() {
    if (!guard()) return;
    tone({ freq: 420, slideTo: 300, dur: 0.09, wave: 'triangle', gain: 0.1 });
  },
  /** chuyền máy sang người kế */
  pass() {
    if (!guard()) return;
    noise(0, 0.22, 500, 0.08, 1600);
  },
  /** giữ tay mở thẻ từ — cố ý TRUNG TÍNH, không được khác nhau theo vai
   *  vì cả bàn đang ngồi cạnh và sẽ nghe thấy */
  peek() {
    if (!guard()) return;
    tone({ freq: 660, dur: 0.12, wave: 'sine', gain: 0.09, cutoff: 2000 });
  },
  /** động tác lật thẻ, phát ngay khi chạm */
  flip() {
    if (!guard()) return;
    noise(0, 0.26, 900, 0.1, 2600);
    tone({ freq: 300, slideTo: 620, dur: 0.2, wave: 'triangle', gain: 0.1 });
  },
  /** lật ra Dân Thường: hợp âm trưởng, nhẹ nhõm */
  revealCivilian() {
    if (!guard()) return;
    [523.25, 659.25, 783.99].forEach((f, i) =>
      tone({ freq: f, at: i * 0.07, dur: 0.5, wave: 'sine', gain: 0.13, cutoff: 3000 }),
    );
  },
  /** lật ra Gián Điệp: quãng nghịch đi xuống, căng thẳng */
  revealUndercover() {
    if (!guard()) return;
    tone({ freq: 220, slideTo: 110, dur: 0.55, wave: 'sawtooth', gain: 0.13, cutoff: 900 });
    tone({ freq: 233, at: 0.02, dur: 0.5, wave: 'square', gain: 0.07, cutoff: 700 });
    noise(0, 0.4, 1400, 0.07, 300);
  },
  /** lật ra Mũ Trắng: lơ lửng, huyền bí */
  revealWhite() {
    if (!guard()) return;
    [392, 554.37, 740].forEach((f, i) =>
      tone({ freq: f, at: i * 0.1, dur: 0.7, wave: 'sine', gain: 0.1, cutoff: 4000 }),
    );
    noise(0.05, 0.5, 3000, 0.04, 5000);
  },
  /** ai đó bị kéo theo / chết dây chuyền */
  thud() {
    if (!guard()) return;
    tone({ freq: 150, slideTo: 60, dur: 0.3, wave: 'sine', gain: 0.22 });
    noise(0, 0.18, 220, 0.12);
  },
  /** Kẻ Báo Thù kích hoạt */
  revenge() {
    if (!guard()) return;
    noise(0, 0.5, 600, 0.16, 120);
    tone({ freq: 180, slideTo: 50, dur: 0.5, wave: 'sawtooth', gain: 0.16, cutoff: 800 });
  },
  correct() {
    if (!guard()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, at: i * 0.08, dur: 0.28, wave: 'triangle', gain: 0.15 }),
    );
  },
  wrong() {
    if (!guard()) return;
    tone({ freq: 300, slideTo: 140, dur: 0.45, wave: 'sawtooth', gain: 0.15, cutoff: 1100 });
  },
  /** kết thúc ván — thắng */
  fanfare() {
    if (!guard()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) =>
      tone({ freq: f, at: i * 0.11, dur: 0.5, wave: 'triangle', gain: 0.16, cutoff: 5000 }),
    );
    [261.63, 329.63, 392].forEach((f) =>
      tone({ freq: f, at: 0.44, dur: 0.9, wave: 'sine', gain: 0.1 }),
    );
  },
  /** kết thúc ván — phe ẩn danh thắng, tối hơn */
  fanfareDark() {
    if (!guard()) return;
    const notes = [440, 523.25, 622.25, 830.61];
    notes.forEach((f, i) =>
      tone({ freq: f, at: i * 0.12, dur: 0.55, wave: 'sawtooth', gain: 0.11, cutoff: 1600 }),
    );
    [110, 164.81, 207.65].forEach((f) =>
      tone({ freq: f, at: 0.48, dur: 1.1, wave: 'sine', gain: 0.12 }),
    );
  },
  /** kết thúc ván — Cặp Đôi thắng, ngọt ngào */
  fanfareLove() {
    if (!guard()) return;
    [587.33, 739.99, 880, 1174.66].forEach((f, i) =>
      tone({ freq: f, at: i * 0.12, dur: 0.7, wave: 'sine', gain: 0.14, cutoff: 4000 }),
    );
  },
};

/** Nhạc nền: pad trầm đổi hợp âm chậm, cố ý nhạt để không át tiếng nói chuyện */
const CHORDS = [
  [130.81, 196, 261.63],
  [146.83, 220, 293.66],
  [164.81, 246.94, 329.63],
  [110, 164.81, 220],
];

function playPad(index: number) {
  const c = ensureCtx();
  if (!c || !musicGain) return;
  const t0 = c.currentTime;
  const dur = 7.5;
  for (const f of CHORDS[index % CHORDS.length]) {
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 700;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.16, t0 + 2);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(filt);
    filt.connect(env);
    env.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.1);
  }
}

export function startMusic() {
  const c = ensureCtx();
  if (!c || !master || musicOn || !musicEnabled) return;
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
  }
  musicOn = true;
  let i = 0;
  playPad(i++);
  musicTimer = window.setInterval(() => {
    if (!musicOn) return;
    playPad(i++);
  }, 7000);
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && ctx) {
    musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
    window.setTimeout(() => {
      if (!musicOn && musicGain) musicGain.gain.value = 0.5;
    }, 1500);
  }
}
