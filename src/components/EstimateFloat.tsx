import { fmtMan } from '../lib/calc';
import type { Estimate } from '../lib/estimate';

type Props = {
  visible: boolean;
  est: Estimate;
  onShow: () => void;
};

/** PC専用: 見積セクションが画面外のとき右下に出すショートカット */
export function EstimateFloat({ visible, est, onShow }: Props) {
  if (!visible || !est.calibrated) return null;

  return (
    <button type="button" className="est-float" onClick={onShow}>
      <span className="est-float-label">開発費の概算</span>
      <span className="est-float-range">
        {fmtMan(est.devLow)}〜{fmtMan(est.devHigh)}
        <span className="u">万円</span>
      </span>
      <span className="est-float-action">見積もりを表示</span>
    </button>
  );
}
