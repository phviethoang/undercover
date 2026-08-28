import { Component } from 'react';
import type { ReactNode } from 'react';
import { session } from './storage';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Lưới an toàn cuối cùng: một lỗi render lẻ sẽ làm React gỡ sạch cây và người
 * chơi chỉ thấy trang trắng giữa buổi. Bắt lại để còn đường thoát.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen crash">
        <div className="result-emoji">🛠️</div>
        <h2>Ối, app vấp một lỗi</h2>
        <p className="guess-hint">
          Ván đang chơi có thể đã hỏng. Bấm nút dưới để dọn và bắt đầu lại — bảng điểm cả buổi vẫn
          được giữ nguyên.
        </p>
        <button
          className="btn btn-primary btn-big"
          onClick={() => {
            session.clear();
            location.reload();
          }}
        >
          Dọn ván lỗi và chơi lại
        </button>
        <p className="crash-detail">{this.state.error.message}</p>
      </div>
    );
  }
}
