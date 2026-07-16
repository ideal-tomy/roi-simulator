import { fmtMan } from '../lib/calc';
import type { Kit, Answers, Estimate } from '../lib/estimate';

type Props = {
  kit: Kit;
  answers: Answers;
  est: Estimate;
  onAnswer: (qid: string, value: string) => void;
  onReset: () => void;
};

export function EstimateWizard({ kit, answers, est, onAnswer, onReset }: Props) {
  const pct = Math.round((est.answered / est.total) * 100);
  const done = est.answered === est.total;

  return (
    <section className="est">
      <div className="wrap">
        <div className="est-head">
          <div>
            <div className="eyebrow">かんたん概算見積もり｜{kit.name}</div>
            <h2 className="est-title">まず、いくらで作れるかを出します。</h2>
            <p className="est-lead">{kit.summary}。下の質問に答えるほど、金額の幅が狭まります。</p>
          </div>
          {est.answered > 0 && (
            <button className="est-reset" onClick={onReset}>回答をクリア</button>
          )}
        </div>

        {!est.calibrated && (
          <div className="est-guard" role="alert">
            <b>⚠ 人日・単価が未設定です。</b>
            実績値（<code>unitPrice</code> / <code>baseDays</code> / 各選択肢の <code>days</code>）を
            <code>src/data/kits/{kit.id}.json</code> に入れると、ここに金額が表示されます。
            未設定のあいだは金額を出しません。
          </div>
        )}

        <div className="est-grid">
          <div className="est-qs">
            {kit.questions.map((q) => (
              <div className="est-q" key={q.id}>
                <div className="est-ql">{q.label}</div>
                {q.hint && <div className="est-qh">{q.hint}</div>}
                <div className="est-opts">
                  {q.options.map((o) => (
                    <button
                      key={o.value}
                      className="est-opt"
                      aria-pressed={answers[q.id] === o.value}
                      onClick={() => onAnswer(q.id, o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="est-result">
            <div className="est-card">
              <div className="est-cl">開発費の概算</div>
              {est.calibrated ? (
                <div className="est-range">
                  {fmtMan(est.devLow)}<span className="u">万</span>
                  <span className="tilde">〜</span>
                  {fmtMan(est.devHigh)}<span className="u">万円</span>
                </div>
              ) : (
                <div className="est-range muted">—<span className="u">（単価未設定）</span></div>
              )}

              <div className="est-prog">
                <div className="est-bar"><span style={{ width: `${pct}%` }} /></div>
                <div className="est-progtxt">
                  {done
                    ? '全問回答済み。これ以上は要件を伺って精度を上げます。'
                    : `${est.total}問中 ${est.answered}問に回答。答えるほど幅が狭まります。`}
                </div>
              </div>

              {est.calibrated && (
                <div className="est-monthly">
                  月額の目安：{fmtMan(est.monthlyLow)}〜{fmtMan(est.monthlyHigh)}万円
                  <small>（保守・インフラ・従量を含む）</small>
                </div>
              )}

              <div className="est-caution">
                この金額はあくまで<b>概算</b>です。正式なお見積もりは、要件を伺ったうえでご提示します。
              </div>
            </div>

            <div className="est-flow">
              下のシミュレーターには、<b>この概算の上限</b>が自動で入ります。
              <small>厳しい方の金額で回収が成立するか、を見るためです。</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
