import { useEffect, useMemo, useState } from 'react';
import { fmtMan } from '../lib/calc';
import type { CompanySize, Environment } from '../lib/context';
import type { Kit, KitQuestion, Answers, Estimate } from '../lib/estimate';
import { pickHighlightFactors, SCOPE_FACTORS } from '../lib/scopeFactors';

type Props = {
  kit: Kit;
  answers: Answers;
  est: Estimate;
  industryName: string;
  /** 会社規模（変動要因ハイライト用・金額計算は App 側） */
  companySize?: CompanySize | null;
  /** 使用環境（変動要因ハイライト用） */
  environment?: Environment | null;
  /** 業種 id（変動要因ハイライト用） */
  industryId?: string | null;
  /** false のときコンテキストは表示のみ（embed で業種ピッカーが無い等） */
  contextInteractive?: boolean;
  /** 規模・環境未選択時などの注意（本体ではピッカー下に出すので省略可） */
  contextNotes?: string[];
  /** HP など入口の from=（表示のみ） */
  fromHint?: string | null;
  /** 自由記述（金額非連動） */
  memo?: string;
  onMemoChange?: (value: string) => void;
  memoMaxLength?: number;
  onAnswer: (qid: string, value: string) => void;
  onReset: () => void;
  onScrollToPickers?: () => void;
};

const MOBILE_MQ = '(max-width: 760px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
      {q.unansweredMode === 'high' && !answers[q.id] && (
        <div className="est-qnote">未回答のため、安全側で計算中</div>
      )}
      <div className="est-opts">
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
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

function ScopeFactorsPanel({
  answers,
  companySize,
  environment,
  industryId,
  variant = 'card',
}: {
  answers: Answers;
  companySize?: CompanySize | null;
  environment?: Environment | null;
  industryId?: string | null;
  /** card = 結果カード内（濃色） / panel = モバイル用（淡色） */
  variant?: 'card' | 'panel';
}) {
  const [open, setOpen] = useState(false);
  const highlights = useMemo(
    () =>
      pickHighlightFactors({
        answers,
        size: companySize ?? null,
        environment: environment ?? null,
        industryId,
      }),
    [answers, companySize, environment, industryId],
  );

  return (
    <div className={`est-scope est-scope-${variant}`}>
      <div className="est-scope-label">主な変動要因</div>
      <ul className="est-scope-highlights">
        {highlights.map((f) => (
          <li key={f.id}>{f.label}</li>
        ))}
      </ul>

      <div className="est-scope-acc">
        <button
          type="button"
          className="est-scope-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>この概算に入りにくい要素</span>
          <span className="est-scope-chevron" aria-hidden>{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="est-scope-body">
            <p className="est-scope-lead">
              金額には自動反映しません。中堅以上や要件が厚い案件では、確認後に上振れすることがあります。
            </p>
            <ul className="est-scope-list">
              {SCOPE_FACTORS.map((f) => (
                <li key={f.id}>
                  <span className="est-scope-item-label">{f.label}</span>
                  <span className="est-scope-item-detail">{f.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  est,
  pct,
  basicDone,
  optionalQsLen,
  optionalAnswered,
  answers,
  companySize,
  environment,
  industryId,
}: {
  est: Estimate;
  pct: number;
  basicDone: boolean;
  optionalQsLen: number;
  optionalAnswered: number;
  answers: Answers;
  companySize?: CompanySize | null;
  environment?: Environment | null;
  industryId?: string | null;
}) {
  return (
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
            ? optionalAnswered === optionalQsLen && optionalQsLen > 0
              ? '基本＋追加の回答済み'
              : '基本は回答済み。追加回答で精度を上げられます'
            : `基本 ${est.basicTotal}問中 ${est.basicAnswered}問`}
        </div>
      </div>

      {est.calibrated && (
        <div className="est-monthly">
          月額の目安：{fmtMan(est.monthlyLow)}〜{fmtMan(est.monthlyHigh)}万円
          <small>（保守・インフラ・従量を含む）</small>
        </div>
      )}

      <ScopeFactorsPanel
        answers={answers}
        companySize={companySize}
        environment={environment}
        industryId={industryId}
        variant="card"
      />

      <div className="est-caution">
        この金額はあくまで<b>概算</b>です。正式な金額は要件確認後に提示します。
      </div>
    </div>
  );
}

type StepPhase = 'basic' | 'optional-gate' | 'optional' | 'done';

export function EstimateWizard({
  kit,
  answers,
  est,
  industryName,
  companySize = null,
  environment = null,
  industryId = null,
  contextInteractive = true,
  contextNotes = [],
  fromHint = null,
  memo = '',
  onMemoChange,
  memoMaxLength = 200,
  onAnswer,
  onReset,
  onScrollToPickers,
}: Props) {
  const isMobile = useIsMobile();
  const basicQs = useMemo(() => kit.questions.filter((q) => !q.optional), [kit.questions]);
  const optionalQs = useMemo(() => kit.questions.filter((q) => q.optional), [kit.questions]);
  const optionalAnswered = optionalQs.filter((q) => !!answers[q.id]).length;
  const [detailsOpen, setDetailsOpen] = useState(optionalAnswered > 0);

  const [phase, setPhase] = useState<StepPhase>('basic');
  const [step, setStep] = useState(0);

  // kit 切替・リセットでステップを最初へ
  useEffect(() => {
    setPhase('basic');
    setStep(0);
    setDetailsOpen(optionalAnswered > 0);
  }, [kit.id]);

  const basicDone = est.basicTotal > 0 && est.basicAnswered === est.basicTotal;
  const pct = est.basicTotal
    ? Math.round((est.basicAnswered / est.basicTotal) * 100)
    : Math.round((est.answered / est.total) * 100);

  const currentBasic = basicQs[step];
  const currentOptional = optionalQs[step];

  const stepLabel = (() => {
    if (phase === 'basic' && basicQs.length > 0) {
      return `基本 ${step + 1} / ${basicQs.length}`;
    }
    if (phase === 'optional' && optionalQs.length > 0) {
      return `追加 ${step + 1} / ${optionalQs.length}`;
    }
    if (phase === 'optional-gate') return '追加の質問';
    return '完了';
  })();

  const advanceAfterAnswer = () => {
    const go = () => {
      if (phase === 'basic') {
        if (step < basicQs.length - 1) {
          setStep((s) => s + 1);
        } else if (optionalQs.length > 0) {
          setPhase('optional-gate');
          setStep(0);
        } else {
          setPhase('done');
        }
        return;
      }
      if (phase === 'optional') {
        if (step < optionalQs.length - 1) {
          setStep((s) => s + 1);
        } else {
          setPhase('done');
        }
      }
    };
    if (prefersReducedMotion()) go();
    else window.setTimeout(go, 220);
  };

  const handleMobileAnswer = (qid: string, value: string) => {
    onAnswer(qid, value);
    // 同じ選択肢のトグル解除時は進まない
    if (answers[qid] === value) return;
    advanceAfterAnswer();
  };

  const skip = () => {
    if (phase === 'basic') {
      if (step < basicQs.length - 1) setStep((s) => s + 1);
      else if (optionalQs.length > 0) {
        setPhase('optional-gate');
        setStep(0);
      } else setPhase('done');
      return;
    }
    if (phase === 'optional') {
      if (step < optionalQs.length - 1) setStep((s) => s + 1);
      else setPhase('done');
    }
  };

  const back = () => {
    if (phase === 'done') {
      if (optionalQs.length > 0) {
        setPhase('optional');
        setStep(optionalQs.length - 1);
      } else {
        setPhase('basic');
        setStep(Math.max(0, basicQs.length - 1));
      }
      return;
    }
    if (phase === 'optional-gate') {
      setPhase('basic');
      setStep(Math.max(0, basicQs.length - 1));
      return;
    }
    if (phase === 'optional') {
      if (step > 0) setStep((s) => s - 1);
      else setPhase('optional-gate');
      return;
    }
    if (phase === 'basic' && step > 0) setStep((s) => s - 1);
  };

  const canBack =
    phase === 'done'
    || phase === 'optional-gate'
    || phase === 'optional'
    || (phase === 'basic' && step > 0);

  const contextInner = (
    <>
      <span className="est-context-label">いまの見積もり</span>
      <span className="est-context-value">
        {industryName}<span className="est-context-x" aria-hidden> × </span>{kit.name}
      </span>
    </>
  );

  return (
    <section className={`est${isMobile ? ' est-mobile' : ''}`}>
      <div className="est-context-wrap">
        <div className="wrap">
          {contextInteractive && onScrollToPickers ? (
            <button
              type="button"
              className="est-context"
              onClick={onScrollToPickers}
              title="業種・見積内容を変更"
            >
              {contextInner}
              <span className="est-context-action">変更</span>
            </button>
          ) : (
            <div className="est-context est-context-static">{contextInner}</div>
          )}
        </div>
      </div>

      <div className="wrap">
        <div className="est-head">
          <div>
            <div className="eyebrow">概算見積もり｜{kit.name}</div>
            <h2 className="est-title">開発費の目安を出します。</h2>
            <p className="est-lead">
              {kit.id === 'webapp'
                ? '近いものが無い場合も、汎用の業務システムとして概算できます。必要なら下に一言メモを残せます。'
                : kit.summary}
            </p>
          </div>
          {est.answered > 0 && (
            <button
              type="button"
              className="est-reset"
              onClick={() => {
                onReset();
                setPhase('basic');
                setStep(0);
              }}
            >
              回答をクリア
            </button>
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

        {fromHint?.startsWith('hp-') && (
          <div className="est-from-hint" role="status">
            HPからの案内を反映しています
          </div>
        )}

        {contextNotes.length > 0 && (
          <div className="est-ctx-notes" role="status">
            {contextNotes.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
        )}

        {onMemoChange && (
          <div className="est-memo">
            <label className="est-memo-label" htmlFor="est-memo-input">
              やりたいことの一言（任意）
            </label>
            <p className="est-memo-hint">金額には使いません。担当確認用のメモです。</p>
            <textarea
              id="est-memo-input"
              className="est-memo-input"
              rows={2}
              maxLength={memoMaxLength}
              value={memo}
              placeholder="例: 問い合わせ対応を自動化したい"
              onChange={(e) => onMemoChange(e.target.value)}
            />
            <div className="est-memo-count">{memo.length}/{memoMaxLength}</div>
          </div>
        )}

        {/* —— デスクトップ: 一覧 + sticky カード —— */}
        {!isMobile && (
          <div className="est-grid">
            <div className="est-panel" aria-label="見積もりに対する質問">
              <div className="est-panel-badge">見積もりの質問</div>
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
                        追加で答える
                        {optionalAnswered > 0 && (
                          <small>（{optionalQs.length}問中 {optionalAnswered}問）</small>
                        )}
                      </span>
                      <span className="est-details-chevron" aria-hidden>{detailsOpen ? '−' : '+'}</span>
                    </button>
                    {detailsOpen && (
                      <div className="est-details-body">
                        <p className="est-details-lead">
                          未回答の項目は、安全側で計算します。
                        </p>
                        {optionalQs.map((q) => (
                          <QuestionBlock key={q.id} q={q} answers={answers} onAnswer={onAnswer} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="est-result">
              <ResultCard
                est={est}
                pct={pct}
                basicDone={basicDone}
                optionalQsLen={optionalQs.length}
                optionalAnswered={optionalAnswered}
                answers={answers}
                companySize={companySize}
                environment={environment}
                industryId={industryId}
              />
              <div className="est-flow">
                下の試算には、<b>この概算の上限</b>が入ります。
              </div>
            </div>
          </div>
        )}

        {/* —— モバイル: 1問ステップ —— */}
        {isMobile && (
          <>
            <div className="est-panel est-panel-step" aria-label="見積もりに対する質問">
              <div className="est-panel-badge">見積もりの質問</div>
              <div className="est-step">
                <div className="est-step-meta" aria-live="polite">
                  <span className="est-step-label">{stepLabel}</span>
                  <div className="est-bar est-step-bar"><span style={{ width: `${pct}%` }} /></div>
                </div>

                {phase === 'basic' && currentBasic && (
                  <QuestionBlock
                    q={currentBasic}
                    answers={answers}
                    onAnswer={handleMobileAnswer}
                  />
                )}

                {phase === 'optional-gate' && (
                  <div className="est-gate">
                    <p className="est-gate-title">基本の質問は終わりました。</p>
                    <p className="est-gate-lead">
                      追加で答えると精度が上がります。スキップしても概算は使えます（未回答は安全側）。
                    </p>
                    <button
                      type="button"
                      className="est-gate-primary"
                      onClick={() => {
                        setPhase('optional');
                        setStep(0);
                      }}
                    >
                      追加で答える
                    </button>
                    <button
                      type="button"
                      className="est-gate-secondary"
                      onClick={() => setPhase('done')}
                    >
                      このまま進む
                    </button>
                  </div>
                )}

                {phase === 'optional' && currentOptional && (
                  <QuestionBlock
                    q={currentOptional}
                    answers={answers}
                    onAnswer={handleMobileAnswer}
                  />
                )}

                {phase === 'done' && (
                  <div className="est-gate">
                    <p className="est-gate-title">概算の準備ができました。</p>
                    <p className="est-gate-lead">
                      下の金額を確認し、回収の目安を見てください。回答はいつでも直せます。
                    </p>
                  </div>
                )}

                <div className="est-step-nav">
                  <button type="button" className="est-nav-btn" disabled={!canBack} onClick={back}>
                    戻る
                  </button>
                  {(phase === 'basic' || phase === 'optional') && (
                    <button type="button" className="est-nav-btn est-nav-skip" onClick={skip}>
                      スキップ
                    </button>
                  )}
                </div>

                <div className="est-flow est-flow-mobile">
                  下の試算には、<b>この概算の上限</b>が入ります。
                </div>
              </div>
            </div>

            <div className="est-scope-mobile">
              <ScopeFactorsPanel
                answers={answers}
                companySize={companySize}
                environment={environment}
                industryId={industryId}
                variant="panel"
              />
            </div>
          </>
        )}
      </div>

      {/* モバイル固定金額バー */}
      {isMobile && (
        <div className="est-dock" role="status" aria-live="polite">
          <div className="est-dock-inner">
            <div className="est-dock-label">開発費の概算</div>
            {est.calibrated ? (
              <div className="est-dock-range">
                {fmtMan(est.devLow)}〜{fmtMan(est.devHigh)}
                <span className="u">万円</span>
              </div>
            ) : (
              <div className="est-dock-range muted">単価未設定</div>
            )}
            {est.calibrated && (
              <div className="est-dock-monthly">
                月額 {fmtMan(est.monthlyLow)}〜{fmtMan(est.monthlyHigh)}万
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
