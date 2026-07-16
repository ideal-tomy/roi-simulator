import { useMemo, useState } from 'react';
import { fmtMan } from '../lib/calc';
import type { Kit, KitQuestion, Answers, Estimate } from '../lib/estimate';

type Props = {
  kit: Kit;
  answers: Answers;
  est: Estimate;
  onAnswer: (qid: string, value: string) => void;
  onReset: () => void;
};

function QuestionBlock({
  q,
  answers,
  onAnswer,
}: {
  q: KitQuestion;
  answers: Answers;
  onAnswer: (qid: string, value: string) => void;
}) {
  return (
    <div className="est-q">
      <div className="est-ql">{q.label}</div>
      {q.hint && <div className="est-qh">{q.hint}</div>}
      {q.unansweredMode === 'high' && answers[q.id] == null && (
        <div className="est-qnote">未回答のため「重い方」で計算中</div>
      )}
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
  );
}

export function EstimateWizard({ kit, answers, est, onAnswer, onReset }: Props) {
  const basicQs = useMemo(() => kit.questions.filter((q) => !q.optional), [kit.questions]);
  const optionalQs = useMemo(() => kit.questions.filter((q) => q.optional), [kit.questions]);
  const optionalAnswered = optionalQs.filter((q) => answers[q.id] != null).length;
  const [detailsOpen, setDetailsOpen] = useState(optionalAnswered > 0);

  const basicDone = est.basicTotal > 0 && est.basicAnswered === est.basicTotal;
  const pct = est.basicTotal
    ? Math.round((est.basicAnswered / est.basicTotal) * 100)
    : Math.round((est.answered / est.total) * 100);

  return (
    <section className="est">
      <div className="wrap">
        <div className="est-head">
          <div>
            <div className="eyebrow">かんたん概算見積もり｜{kit.name}</div>
            <h2 className="est-title">まず、いくらで作れるかを出します。</h2>
            <p className="est-lead">
              {kit.summary}。基本の質問に答えるほど幅が決まります。
              より正確にしたいときだけ、追加の質問を開いてください。
            </p>
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
            {basicQs.map((q) => (
              <QuestionBlock key={q.id} q={q} answers={answers} onAnswer={onAnswer} />
            ))}

            {optionalQs.length > 0 && (
              <div className="est-details">
                <button
                  type="button"
                  className="est-details-toggle"
                  aria-expanded={detailsOpen}
                  onClick={() => setDetailsOpen((v) => !v)}
                >
                  <span>
                    より正確な数値を算出したい場合は、質問への回答を追加
                    {optionalAnswered > 0 && (
                      <small>（{optionalQs.length}問中 {optionalAnswered}問回答済み）</small>
                    )}
                  </span>
                  <span className="est-details-chevron" aria-hidden>{detailsOpen ? '−' : '+'}</span>
                </button>
                {detailsOpen && (
                  <div className="est-details-body">
                    <p className="est-details-lead">
                      審査やデータ取り込みなど、見落としやすい項目です。
                      未回答の項目は、安い側に倒さず安全側で計算します。
                    </p>
                    {optionalQs.map((q) => (
                      <QuestionBlock key={q.id} q={q} answers={answers} onAnswer={onAnswer} />
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  {basicDone
                    ? optionalAnswered === optionalQs.length && optionalQs.length > 0
                      ? '基本＋追加の回答済み。これ以上は要件を伺って精度を上げます。'
                      : '基本は回答済み。追加回答でさらに精度を上げられます。'
                    : `基本 ${est.basicTotal}問中 ${est.basicAnswered}問に回答。`}
                </div>
              </div>

              {est.calibrated && (
                <div className="est-monthly">
                  月額の目安：{fmtMan(est.monthlyLow)}〜{fmtMan(est.monthlyHigh)}万円
                  <small>（保守・インフラ・従量を含む）</small>
                </div>
              )}

              <div className="est-caution">
                この金額はあくまで<b>概算</b>です。デモを流用できる範囲は工程が消えるため安く、
                フルカスタムはスコープが大きいため高くなります。値引きではなくメニューです。
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
