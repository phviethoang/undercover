import type { PointRules } from '../game/types';

interface Props {
  points: PointRules;
  onBack: () => void;
}

export function Rules({ points, onBack }: Props) {
  return (
    <div className="screen rules">
      <header className="topbar">
        <button className="btn-back" onClick={onBack}>
          ←
        </button>
        <h2>Luật chơi</h2>
      </header>

      <div className="rules-body">
        <section>
          <h3>🎭 Ba phe</h3>
          <p>
            <b>😇 Dân Thường</b> — cùng nhận một từ khóa.
          </p>
          <p>
            <b>🕵️ Gián Điệp</b> — nhận một từ <i>gần nghĩa</i> với từ của Dân. Gián Điệp{' '}
            <b>không biết mình là Gián Điệp</b> — ai cũng tưởng mình là Dân!
          </p>
          <p>
            <b>🤍 Mũ Trắng</b> — không nhận từ nào, phải giả vờ hòa nhập và đoán từ của Dân.
          </p>
        </section>

        <section>
          <h3>🔄 Diễn biến</h3>
          <p>1. Chuyền điện thoại vòng tròn, mỗi người đặt tên và bí mật xem từ của mình.</p>
          <p>
            2. Theo thứ tự app chỉ định, mỗi người <b>mô tả từ của mình bằng một từ/cụm ngắn</b>.
          </p>
          <p>
            3. Hết vòng, cả nhóm thảo luận rồi <b>vote loại một người</b>. Người cầm máy bấm chọn —
            app lật vai người đó. Người đã bị loại không được vote ở vòng sau.
          </p>
          <p>4. Lặp lại cho đến khi có phe thắng.</p>
        </section>

        <section>
          <h3>🗣️ Khi mô tả</h3>
          <p>
            — <b>Không được nói trúng từ khóa</b> của mình, dù chỉ một phần.
          </p>
          <p>— Không lặp lại nguyên si mô tả người trước đã dùng.</p>
          <p>
            — Mô tả phải <b>đúng sự thật</b> với từ mình cầm. Nói dối trắng trợn là phạm luật, trừ Mũ
            Trắng (vốn chẳng có từ nào để mà đúng).
          </p>
          <p>
            — Đừng mô tả quá chính xác: nói trúng phóc thì đồng đội nhận ra, nhưng Gián Điệp cũng
            nhận ra.
          </p>
        </section>

        <section>
          <h3>⚖️ Hòa phiếu</h3>
          <p>Khi hai người bằng phiếu, luật gốc cho ba cách xử — cả nhóm chọn trước một cách:</p>
          <p>1. Hai người đó mô tả thêm một lượt nữa, rồi vote lại.</p>
          <p>2. Oẳn tù tì, ai thua thì bị loại.</p>
          <p>3. Bỏ qua vòng này, không loại ai cả.</p>
          <p className="rules-note">
            App không tự xử hòa — người cầm máy chỉ bấm chọn người cuối cùng bị loại sau khi nhóm đã
            phân định xong.
          </p>
        </section>

        <section>
          <h3>🏆 Điều kiện thắng</h3>
          <p>
            <b>Dân thắng</b> khi loại hết Gián Điệp và Mũ Trắng.
          </p>
          <p>
            <b>Gián Điệp thắng</b> khi sống sót tới lúc Dân không còn áp đảo về số lượng — tức số
            người phe ẩn danh còn sống bằng hoặc hơn số Dân còn sống.
          </p>
          <p>
            <b>Mũ Trắng thắng</b> theo hai cách: <b>đoán đúng từ của Dân</b> — được đoán{' '}
            <b>bất cứ lúc nào</b>, kể cả khi vừa bị vote loại; hoặc <b>sống sót tới cuối ván</b>{' '}
            cùng phe ẩn danh. Đoán sai thì bị loại như thường.
          </p>
        </section>

        <section>
          <h3>💯 Tính điểm</h3>
          <p>
            Điểm cộng dồn suốt buổi chơi, xem ở mục <b>Bảng điểm</b>:
          </p>
          <p>
            😇 Dân thắng: <b>+{points.civilian}</b> cho mỗi Dân
          </p>
          <p>
            🕵️ Gián Điệp thắng: <b>+{points.undercover}</b> cho mỗi Gián Điệp
          </p>
          <p>
            🤍 Mũ Trắng thắng: <b>+{points.white}</b> — khó nhất nên ăn đậm nhất
          </p>
          <p className="rules-note">
            Mũ Trắng chỉ ăn điểm khi tự thắng (đoán trúng hoặc sống sót tới cuối). Điểm chỉnh được
            trong phần thiết lập ván; bản Undercover quốc tế dùng thang 2/10/6 — họ coi Gián Điệp
            sống sót mới là khó nhất.
          </p>
        </section>

        <section>
          <h3>👥 Chia vai bao nhiêu là chuẩn</h3>
          <p>Bảng gợi ý theo game gốc (Dân / Gián Điệp / Mũ Trắng):</p>
          <p>3–5 người: 1 Gián Điệp, chưa nên có Mũ Trắng</p>
          <p>6–7 người: 1 Gián Điệp + 1 Mũ Trắng</p>
          <p>8–10 người: 2 Gián Điệp + 1 Mũ Trắng</p>
          <p>11–13 người: 3 Gián Điệp + 1 Mũ Trắng</p>
          <p>14–16 người: 3 Gián Điệp + 2 Mũ Trắng</p>
          <p>17–20 người: 4 Gián Điệp + 2 Mũ Trắng</p>
          <p className="rules-note">
            Nguyên tắc chung: số Mũ Trắng không vượt số Gián Điệp, và Dân phải đông hơn tổng hai phe
            kia — nếu không thì phe ẩn danh thắng ngay từ khi chia bài. Màn thiết lập có nút áp cấu
            hình chuẩn theo số người.
          </p>
        </section>

        <section>
          <h3>⚠️ Luật nhà</h3>
          <p>— Mũ Trắng không bao giờ là người mô tả đầu tiên.</p>
          <p>
            — Ai bấm nút “Mũ Trắng đoán từ” mà <b>không phải</b> Mũ Trắng sẽ bị lộ vai và loại luôn.
            Đừng nhận vơ!
          </p>
          <p>— Từ đã chơi sẽ được đẩy xuống cuối hàng đợi, gần như không gặp lại.</p>
        </section>
      </div>

      <button className="btn btn-primary" onClick={onBack}>
        Đã hiểu!
      </button>
    </div>
  );
}
