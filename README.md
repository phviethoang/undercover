# 🕵️ Undercover — Ai Là Gián Điệp?

Game **Undercover** chơi offline cùng nhóm bạn trên **một chiếc điện thoại** (pass-and-play).
Web app tĩnh, không cần server, không cần tài khoản.

**Chơi ngay:** https://phviethoang.github.io/undercover/

## Cách chơi

- Mỗi ván: **Dân Thường** nhận chung một từ, **Gián Điệp** nhận một từ gần nghĩa,
  **Mũ Trắng** không nhận từ nào.
- Chuyền điện thoại vòng tròn để mỗi người đặt tên + bí mật xem từ.
- Ngoài đời: mỗi người mô tả từ của mình bằng một từ/cụm ngắn, rồi cả nhóm vote loại một người —
  app lật vai người đó.
- Mũ Trắng có thể **đoán từ của Dân bất cứ lúc nào** (kể cả khi vừa bị loại) — đoán đúng là thắng ngay.

Chi tiết luật xem ngay trong app (nút *Luật chơi*).

## ⚠️ Kho từ = SPOILER

Kho từ (1235 cặp, 27 chủ đề) chỉ tồn tại trong repo ở dạng **mã hóa**
tại `src/data/wordbank.enc.ts` — để chính người giữ code vẫn tham gia chơi được mà không bị lộ từ.

- Xem thống kê (an toàn, không lộ từ): `npm run words:stats`
- Giải mã toàn bộ (⚠️ spoiler): `node scripts/wordtool.mjs decode --spoiler`
- Thay kho từ mới: chuẩn bị `words.plain.json` (mảng `{id, c, a, b, d}`) rồi chạy
  `node scripts/wordtool.mjs encode words.plain.json`. **Không commit file plain.**

Từ đã chơi được lưu đếm trong `localStorage` của máy và bị đẩy xuống cuối hàng đợi —
không bao giờ xóa, chỉ gần như không lặp lại cho đến khi dùng hết kho.

## Phát triển

```bash
npm install
npm run dev      # chạy local
npm run build    # build ra dist/
```

## Deploy

Push lên nhánh `main` → GitHub Actions tự build và deploy lên GitHub Pages.
Lần đầu cần bật: **Settings → Pages → Source: GitHub Actions**.
