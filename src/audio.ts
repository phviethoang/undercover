/**
 * Âm thanh của game, tổng hợp trực tiếp bằng Web Audio API (không dùng file mp3
 * nào, app vẫn chạy offline). Dùng FM synthesis cho tiếng kèn đồng và một tầng
 * reverb dựng sẵn để các câu nhạc có đuôi vang, nghe dày chứ không bị cụt.
 *
 * Quy ước cảm xúc — theo góc nhìn CẢ BÀN chứ không theo bản chất vai:
 *   lật trúng Dân      -> mất người oan  -> "ôi không", kèn tụt giọng
 *   lật trúng Gián Điệp -> bắt được kẻ gian -> "yeah", kèn khải hoàn
 *   lật trúng Mũ Trắng  -> cũng bắt được   -> reo vui, sắc chuông lấp lánh
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
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

/** Đuôi vang: nhân chập với một mẫu nhiễu tắt dần — rẻ mà hiệu quả */
function buildReverb(c: AudioContext, seconds: number, decay: number): ConvolverNode {
  const frames = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, frames, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, decay);
    }
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Trình duyệt chỉ cho tạo tiếng sau một thao tác thật của người dùng */
function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();

      // nhiều lớp chồng nhau dễ vỡ tiếng -> nén nhẹ trước khi ra loa
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;

      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);

      dry = ctx.createGain();
      dry.gain.value = 1;
      dry.connect(master);

      const conv = buildReverb(ctx, 2.2, 2.6);
      wet = ctx.createGain();
      wet.gain.value = 0.34;
      wet.connect(conv);
      conv.connect(master);
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

interface VoiceOpts {
  freq: number;
  /** giây, tính từ lúc gọi */
  at?: number;
  dur?: number;
  gain?: number;
  wave?: OscillatorType;
  /** FM: tỉ lệ tần số điều biến và độ sâu — cho ra chất kèn đồng / chuông */
  fmRatio?: number;
  fmIndex?: number;
  /** rung giọng */
  vibRate?: number;
  vibDepth?: number;
  /** trượt cao độ tới tần số này (portamento) */
  glideTo?: number;
  /** thời điểm bắt đầu trượt, tính theo tỉ lệ của dur */
  glideStart?: number;
  attack?: number;
  /** lọc thông thấp: mở/đóng để mô phỏng bịt mute kèn */
  cutoff?: number;
  cutoffEnd?: number;
  /** lượng gửi sang reverb, 0..1 */
  send?: number;
}

function voice(o: VoiceOpts) {
  const c = ensureCtx();
  if (!c || !dry || !wet) return;
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.4;
  const peak = o.gain ?? 0.18;
  const attack = o.attack ?? 0.015;

  const osc = c.createOscillator();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.glideTo) {
    const gs = t0 + dur * (o.glideStart ?? 0.55);
    osc.frequency.setValueAtTime(o.freq, gs);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glideTo), t0 + dur);
  }

  // FM: một dao động phụ điều biến tần số dao động chính
  if (o.fmRatio && o.fmIndex) {
    const mod = c.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = o.freq * o.fmRatio;
    const modGain = c.createGain();
    modGain.gain.setValueAtTime(o.freq * o.fmIndex, t0);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, o.freq * o.fmIndex * 0.25), t0 + dur);
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    mod.start(t0);
    mod.stop(t0 + dur + 0.05);
  }

  // rung giọng
  if (o.vibRate && o.vibDepth) {
    const lfo = c.createOscillator();
    lfo.frequency.value = o.vibRate;
    const lfoGain = c.createGain();
    lfoGain.gain.value = o.vibDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }

  let node: AudioNode = osc;
  if (o.cutoff) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(o.cutoff, t0);
    if (o.cutoffEnd) f.frequency.exponentialRampToValueAtTime(Math.max(80, o.cutoffEnd), t0 + dur);
    osc.connect(f);
    node = f;
  }

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  env.gain.setValueAtTime(peak, t0 + Math.min(dur * 0.6, attack + dur * 0.35));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(env);

  env.connect(dry);
  if (o.send) {
    const s = c.createGain();
    s.gain.value = o.send;
    env.connect(s);
    s.connect(wet);
  }

  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Nhiễu lọc dải — tiếng lật bài, tiếng nổ, tiếng thịch */
function noise(at: number, dur: number, cutoff: number, gain = 0.14, sweepTo?: number, send = 0) {
  const c = ensureCtx();
  if (!c || !dry || !wet) return;
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
  env.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(f);
  f.connect(env);
  env.connect(dry);
  if (send) {
    const s = c.createGain();
    s.gain.value = send;
    env.connect(s);
    s.connect(wet);
  }
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function guard(): boolean {
  if (!sfxEnabled) return false;
  return ensureCtx() !== null;
}

/** Kèn đồng: FM tỉ lệ 1, độ sâu vừa, lọc mở dần cho ra tiếng "phùuu" */
function brass(freq: number, at: number, dur: number, gain = 0.16, send = 0.3) {
  voice({
    freq,
    at,
    dur,
    gain,
    wave: 'sawtooth',
    fmRatio: 1,
    fmIndex: 0.6,
    vibRate: 5.5,
    vibDepth: freq * 0.006,
    attack: 0.035,
    cutoff: freq * 2.2,
    cutoffEnd: freq * 5,
    send,
  });
}

/** Chuông: FM tỉ lệ lệch hài cho ra sắc kim loại lấp lánh */
function bell(freq: number, at: number, dur: number, gain = 0.13, send = 0.45) {
  voice({
    freq,
    at,
    dur,
    gain,
    wave: 'sine',
    fmRatio: 3.5,
    fmIndex: 1.4,
    attack: 0.005,
    send,
  });
}

export const sfx = {
  tap() {
    if (!guard()) return;
    voice({ freq: 520, dur: 0.07, wave: 'triangle', gain: 0.1, cutoff: 2400 });
  },
  confirm() {
    if (!guard()) return;
    voice({ freq: 480, dur: 0.1, wave: 'triangle', gain: 0.13, send: 0.15 });
    voice({ freq: 720, at: 0.07, dur: 0.14, wave: 'triangle', gain: 0.11, send: 0.2 });
  },
  back() {
    if (!guard()) return;
    voice({ freq: 430, glideTo: 300, glideStart: 0.1, dur: 0.11, wave: 'triangle', gain: 0.1 });
  },
  pass() {
    if (!guard()) return;
    noise(0, 0.26, 500, 0.08, 1800, 0.2);
  },
  /** giữ tay mở thẻ từ — cố ý TRUNG TÍNH, không được khác nhau theo vai
   *  vì cả bàn ngồi cạnh và sẽ nghe thấy */
  peek() {
    if (!guard()) return;
    voice({ freq: 660, dur: 0.14, wave: 'sine', gain: 0.09, cutoff: 2200, send: 0.2 });
  },
  /** động tác lật thẻ, phát ngay khi chạm */
  flip() {
    if (!guard()) return;
    noise(0, 0.3, 900, 0.11, 2800, 0.15);
    voice({ freq: 300, glideTo: 640, glideStart: 0.05, dur: 0.24, wave: 'triangle', gain: 0.1 });
  },

  /** LẬT TRÚNG DÂN THƯỜNG — mất người oan: sad trombone bốn nốt tụt giọng */
  revealCivilian() {
    if (!guard()) return;
    // bốn nốt đi xuống nửa cung, kèn bịt mute (lọc đóng dần) cho tiếng rên
    const steps = [233.08, 220, 207.65, 196];
    steps.forEach((f, i) => {
      voice({
        freq: f,
        at: i * 0.24,
        dur: i === 3 ? 1.05 : 0.3,
        gain: 0.17,
        wave: 'sawtooth',
        fmRatio: 1,
        fmIndex: 0.5,
        vibRate: 5,
        vibDepth: f * 0.008,
        attack: 0.04,
        cutoff: f * 3.4,
        cutoffEnd: f * 1.5,
        // nốt cuối bẻ hơi xuống — cú "wahhh" tuột hẳn
        glideTo: i === 3 ? 138.59 : undefined,
        glideStart: 0.35,
        send: 0.4,
      });
    });
    // nền trầm hụt hơi
    voice({
      freq: 116.54,
      at: 0.72,
      dur: 1.3,
      gain: 0.1,
      wave: 'triangle',
      glideTo: 69.3,
      glideStart: 0.4,
      cutoff: 500,
      send: 0.35,
    });
  },

  /** LẬT TRÚNG GIÁN ĐIỆP — bắt được kẻ gian: kèn khải hoàn đi lên */
  revealUndercover() {
    if (!guard()) return;
    // câu dẫn đi lên
    [392, 523.25, 659.25].forEach((f, i) => brass(f, i * 0.13, 0.22, 0.16, 0.25));
    // nốt đỉnh ngân dài
    brass(783.99, 0.39, 1.15, 0.19, 0.45);
    // hợp âm Đô trưởng đỡ bên dưới
    [261.63, 329.63, 392].forEach((f) => brass(f, 0.39, 1.3, 0.11, 0.4));
    // cú chốt rộn ràng
    noise(0.39, 0.5, 4000, 0.05, 9000, 0.5);
  },

  /** LẬT TRÚNG MŨ TRẮNG — cũng bắt được: reo vui pha sắc chuông lấp lánh */
  revealWhite() {
    if (!guard()) return;
    [523.25, 698.46, 880, 1174.66].forEach((f, i) => bell(f, i * 0.11, 1.5 - i * 0.15, 0.14, 0.5));
    [349.23, 440, 523.25].forEach((f) => brass(f, 0.44, 1.2, 0.1, 0.4));
    noise(0.1, 0.7, 6000, 0.04, 11000, 0.6);
  },

  /** ai đó bị kéo theo / chết dây chuyền */
  thud() {
    if (!guard()) return;
    voice({ freq: 150, glideTo: 55, glideStart: 0.05, dur: 0.4, wave: 'sine', gain: 0.24, send: 0.3 });
    noise(0, 0.2, 220, 0.13, undefined, 0.3);
  },

  /** Kẻ Báo Thù kích hoạt: ngòi nổ xì rồi bùng */
  revenge() {
    if (!guard()) return;
    noise(0, 0.55, 2600, 0.07, 700, 0.2);
    noise(0.5, 0.7, 500, 0.2, 90, 0.5);
    voice({ freq: 200, glideTo: 42, glideStart: 0.1, dur: 0.85, at: 0.5, wave: 'sawtooth', gain: 0.18, cutoff: 900, cutoffEnd: 200, send: 0.4 });
  },

  correct() {
    if (!guard()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.09, 1.1 - i * 0.1, 0.15, 0.45));
    [261.63, 392].forEach((f) => brass(f, 0.3, 1.1, 0.1, 0.4));
  },

  wrong() {
    if (!guard()) return;
    [233.08, 207.65].forEach((f, i) =>
      voice({
        freq: f,
        at: i * 0.26,
        dur: i === 1 ? 0.95 : 0.3,
        gain: 0.17,
        wave: 'sawtooth',
        fmRatio: 1,
        fmIndex: 0.5,
        attack: 0.04,
        cutoff: f * 3,
        cutoffEnd: f * 1.4,
        glideTo: i === 1 ? 130.81 : undefined,
        glideStart: 0.3,
        send: 0.4,
      }),
    );
  },

  /** KẾT THÚC VÁN — Dân thắng: khải hoàn đầy đặn */
  fanfare() {
    if (!guard()) return;
    [523.25, 659.25, 783.99].forEach((f, i) => brass(f, i * 0.14, 0.26, 0.16, 0.3));
    brass(1046.5, 0.42, 1.9, 0.2, 0.5);
    [261.63, 329.63, 392, 523.25].forEach((f) => brass(f, 0.42, 2.1, 0.1, 0.45));
    [1318.5, 1568].forEach((f, i) => bell(f, 0.55 + i * 0.14, 1.6, 0.09, 0.55));
    noise(0.42, 0.7, 5000, 0.05, 11000, 0.5);
  },

  /** KẾT THÚC VÁN — phe ẩn danh thắng: kèn thứ, tối và đắc thắng */
  fanfareDark() {
    if (!guard()) return;
    [440, 523.25, 659.25].forEach((f, i) => brass(f, i * 0.15, 0.28, 0.14, 0.3));
    brass(880, 0.45, 1.9, 0.17, 0.5);
    [110, 164.81, 220, 261.63].forEach((f) => brass(f, 0.45, 2.2, 0.11, 0.45));
    voice({ freq: 55, at: 0.45, dur: 2.3, wave: 'triangle', gain: 0.13, cutoff: 300, send: 0.35 });
  },

  /** KẾT THÚC VÁN — Mũ Trắng thắng: huyền bí rồi bung ra */
  fanfareWhite() {
    if (!guard()) return;
    [587.33, 698.46, 880, 1174.66].forEach((f, i) => bell(f, i * 0.13, 1.9 - i * 0.15, 0.14, 0.55));
    [146.83, 220, 293.66, 369.99].forEach((f) => brass(f, 0.55, 2.1, 0.1, 0.5));
    noise(0.1, 1, 7000, 0.04, 12000, 0.6);
  },

  /** KẾT THÚC VÁN — Cặp Đôi thắng: ấm và ngọt */
  fanfareLove() {
    if (!guard()) return;
    [587.33, 739.99, 880, 1108.73].forEach((f, i) =>
      voice({
        freq: f,
        at: i * 0.15,
        dur: 2 - i * 0.15,
        gain: 0.14,
        wave: 'sine',
        fmRatio: 2,
        fmIndex: 0.35,
        vibRate: 4.5,
        vibDepth: f * 0.005,
        attack: 0.06,
        send: 0.5,
      }),
    );
    [293.66, 369.99, 440].forEach((f) => brass(f, 0.6, 2, 0.09, 0.45));
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
