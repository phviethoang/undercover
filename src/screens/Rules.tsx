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
            2. Theo thứ tự app chỉ định, mỗi người <b>mô tả từ của mình bằng một từ/cụm ngắn</b> —
            không được nói trúng từ khóa, không quá lộ liễu.
          </p>
          <p>
            3. Hết vòng, cả nhóm thảo luận rồi <b>vote loại một người</b>. Người cầm máy bấm chọn —
            app lật vai người đó. Người đã bị loại không được vote ở vòng sau.
          </p>
          <p>4. Lặp lại cho đến khi có phe thắng.</p>
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
            trong phần thiết lập ván; bản Undercover quốc tế dùng thang 2/10/6.
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
