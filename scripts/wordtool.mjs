#!/usr/bin/env node
/**
 * Công cụ quản lý kho từ (dạng mã hóa) của game Undercover.
 *
 *   node scripts/wordtool.mjs encode <words.plain.json>   # mã hóa kho từ -> src/data/wordbank.enc.ts
 *   node scripts/wordtool.mjs stats                       # đếm số cặp theo chủ đề (KHÔNG lộ từ)
 *   node scripts/wordtool.mjs decode --spoiler            # ⚠️ in toàn bộ kho từ ra màn hình
 *
 * Kho từ chỉ tồn tại trong repo ở dạng mã hóa (XOR + base64) để người cầm code
 * vẫn chơi được mà không bị spoil. Đây là chống-nhìn-nhầm, không phải bảo mật.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENC_FILE = resolve(ROOT, 'src/data/wordbank.enc.ts');
const XOR_KEY = 'gian-diep-tram-nam-moi-lo-dien'; // phải khớp src/game/words.ts

function xor(bytes) {
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  }
  return out;
}

function decodeBank() {
  const src = readFileSync(ENC_FILE, 'utf8');
  const m = src.match(/'([A-Za-z0-9+/=\s]+)'/);
  if (!m) throw new Error('Không tìm thấy chuỗi mã hóa trong ' + ENC_FILE);
  const raw = xor(Buffer.from(m[1].replace(/\s+/g, ''), 'base64'));
  return JSON.parse(raw.toString('utf8'));
}

const cmd = process.argv[2];

if (cmd === 'encode') {
  const input = process.argv[3];
  if (!input) {
    console.error('Cách dùng: node scripts/wordtool.mjs encode <words.plain.json>');
    process.exit(1);
  }
  const pairs = JSON.parse(readFileSync(resolve(input), 'utf8'));
  const payload = xor(Buffer.from(JSON.stringify(pairs), 'utf8')).toString('base64');
  const ts = `// ⚠️ SPOILER NẾU GIẢI MÃ — file này chứa toàn bộ kho từ của game ở dạng mã hóa.
// Đừng decode nếu bạn còn muốn tự mình tham gia chơi!
// Sinh bởi: node scripts/wordtool.mjs encode <words.plain.json>
export const WORDBANK_ENC =
  '${payload}';
`;
  writeFileSync(ENC_FILE, ts);
  console.log(`Đã mã hóa ${pairs.length} cặp từ -> ${ENC_FILE}`);
} else if (cmd === 'stats') {
  const pairs = decodeBank();
  const byCat = {};
  for (const p of pairs) byCat[p.c] = (byCat[p.c] ?? 0) + 1;
  console.log(`Tổng: ${pairs.length} cặp từ, ${Object.keys(byCat).length} chủ đề`);
  for (const [c, n] of Object.entries(byCat).sort()) console.log(`  ${c}: ${n}`);
} else if (cmd === 'decode') {
  if (process.argv[3] !== '--spoiler') {
    console.error('⚠️ Lệnh này in TOÀN BỘ kho từ (spoiler). Nếu chắc chắn: thêm cờ --spoiler');
    process.exit(1);
  }
  console.log(JSON.stringify(decodeBank(), null, 2));
} else {
  console.error('Lệnh: encode | stats | decode --spoiler');
  process.exit(1);
}
