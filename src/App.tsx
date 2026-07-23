import { useEffect, useMemo, useRef, useState } from 'react';
import { calculate, fmtInt, fmtMan, fmtPayback, type Inputs } from './lib/calc';
import { getPreset, FEATURED_PRESETS, OTHER_INDUSTRY_ID, type CategoryKey } from './lib/presets';
import { estimate, type Answers } from './lib/estimate';
import { KITS, defaultKitId, getKit } from './lib/kits';
import { getBrand } from './lib/brand';
import { readUrl, writeUrl, shareUrl, embedSnippet, MEMO_MAX_LENGTH, clampMemo } from './lib/url';
import {
  SIZE_OPTIONS,
  ENV_OPTIONS,
  contextNotes,
  type CompanySize,
  type Environment,
} from './lib/context';
import { getRoiCopy } from './lib/roiProfile';
import { Slider, Money } from './components/Fields';
import { BreakEvenChart } from './components/BreakEvenChart';
import { EstimateWizard } from './components/EstimateWizard';
import { EstimateFloat } from './components/EstimateFloat';
import { SiteContextBar } from './components/SiteContextBar';

/** **強調** を <b> に変換する軽量マークアップ */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}</>;
}

export default function App() {
  const url = useMemo(() => readUrl(), []);
  const brand = useMemo(() => getBrand(url.brand), [url.brand]);
  /** embed=minimal は親ページにブランドを任せる。通常 / embed+ui=full はヘッダー表示 */
  const showChrome = url.ui === 'full';

  const [industryId, setIndustryId] = useState(getPreset(url.industry).id);
  const preset = getPreset(industryId);

  const [catKey, setCatKey] = useState<CategoryKey>(
    url.category ?? preset.categories[0].key,
  );
  const category =
    preset.categories.find((c) => c.key === catKey) ?? preset.categories[0];

  const [inputs, setInputs] = useState<Inputs>({ ...category.defaults, ...url.inputs });
  const [answers, setAnswers] = useState<Answers>(url.answers);
  const [kitId, setKitId] = useState<string | null>(url.kit);
  const kit = useMemo(() => getKit(kitId), [kitId]);
  /** デモ直リンク（?kit=）入場。マウント時固定。閉じた後の閲覧モード復帰判定に使う */
  const enteredWithKit = useMemo(() => Boolean(url.kit), [url.kit]);
  /** 見積中かつデモ直リンク: 業界／kit バーを隠して最短導線 */
  const estimateDeepLink = enteredWithKit && Boolean(kit);
  const [companySize, setCompanySize] = useState<CompanySize | null>(url.size);
  const [environment, setEnvironment] = useState<Environment | null>(url.environment);
  const [memo, setMemo] = useState(url.memo);
  const estimateCtx = useMemo(
    () => ({ size: companySize, environment, industryId }),
    [companySize, environment, industryId],
  );
  const ctxNotes = useMemo(() => contextNotes(estimateCtx), [estimateCtx]);

  // 見積もりから初期費用を自動投入するか（ユーザーが手で触ったら止める）
  const [manualCost, setManualCost] = useState(
    url.inputs.initial !== undefined || url.inputs.monthly !== undefined,
  );

  const [copied, setCopied] = useState<string | null>(null);
  const [scrollToEstimate, setScrollToEstimate] = useState(false);
  const [scrollToBrowse, setScrollToBrowse] = useState(false);
  const [estInView, setEstInView] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 761px)').matches : true,
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const estimateRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const kitPickerRef = useRef<HTMLDivElement>(null);
  const wizardAnchorRef = useRef<HTMLDivElement>(null);

  const est = useMemo(
    () => (kit ? estimate(kit, answers, estimateCtx) : null),
    [kit, answers, estimateCtx],
  );

  const roiCopy = useMemo(() => getRoiCopy(kit, category), [kit, category]);
  const heroCopy = kit?.hero ?? {
    eyebrow: category.eyebrow,
    title: category.title,
    lead: category.lead,
  };
  const kitHeroActive = Boolean(kit?.hero);
  /** フッター締め: kit → brand → 業種カテゴリ */
  const closingCopy = kit?.closing ?? brand.closing ?? category.summary;

  /** デモ／共有リンクで kit 指定入場 → 見積質問へ自動スクロール */
  useEffect(() => {
    if (enteredWithKit) setScrollToEstimate(true);
  }, [enteredWithKit]);

  const openEstimate = (id?: string | null) => {
    const next = id ?? kitId ?? defaultKitId();
    if (!next) return;
    setKitId(next);
    setScrollToEstimate(true);
  };

  const closeEstimate = () => {
    setKitId(null);
    setAnswers({});
    setInputs((s) => ({
      ...category.defaults,
      ...(manualCost ? { initial: s.initial, monthly: s.monthly } : {}),
    }));
    setScrollToBrowse(true);
  };

  useEffect(() => {
    if (!scrollToEstimate || !kit) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // ヒーロー差し替え後のレイアウト確定を待ってから見積質問へ
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const target = wizardAnchorRef.current ?? estimateRef.current;
      target?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
      setScrollToEstimate(false);
    };
    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(run, 40);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
    };
  }, [scrollToEstimate, kit]);

  /** 見積クローズ後 → 閲覧モード（業界ピッカー／ヒーロー先頭）へ */
  useEffect(() => {
    if (!scrollToBrowse || kit) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const target = pickerRef.current ?? bodyRef.current;
      target?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
      setScrollToBrowse(false);
    };
    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(run, 40);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
    };
  }, [scrollToBrowse, kit]);

  // kit 切替時: ROI 効果側の defaults を適用（initial/monthly は維持 → 見積連動 effect が担当）
  useEffect(() => {
    if (!kit?.roi) return;
    const d = kit.roi.defaults;
    setInputs((s) => ({
      ...s,
      people: d.people,
      cases: d.cases,
      minutes: d.minutes,
      reduction: d.reduction,
      wage: d.wage,
      other: d.other,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId]);

  // PC幅判定（フロート表示用）
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 761px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // 見積ブロックが見えているか（画面外なら PC フロート）
  useEffect(() => {
    const el = estimateRef.current;
    if (!el || !kit) {
      setEstInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setEstInView(entry.isIntersecting),
      { threshold: 0, rootMargin: '-48px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [kit]);

  // 概算の「上限」を開発費用として自動投入（厳しい方で回収が成立するかを見る）
  useEffect(() => {
    if (!est || !est.calibrated || manualCost) return;
    setInputs((s) => ({
      ...s,
      initial: Math.round(est.devHigh),
      monthly: Math.round(est.monthlyHigh),
    }));
  }, [est, manualCost]);

  const result = useMemo(() => calculate(inputs), [inputs]);
  const pay = fmtPayback(result.payback);
  const ok = isFinite(result.payback);

  const set = (k: keyof Inputs) => (v: number) => {
    if (k === 'initial' || k === 'monthly') setManualCost(true);
    setInputs((s) => ({ ...s, [k]: v }));
  };

  const switchIndustry = (id: string) => {
    const p = getPreset(id);
    const c = p.categories.find((x) => x.key === catKey) ?? p.categories[0];
    setIndustryId(id);
    setCatKey(c.key);
    // kit オープン中は ROI ラベル用 defaults を優先
    const effect = kit?.roi?.defaults ?? {
      people: c.defaults.people,
      cases: c.defaults.cases,
      minutes: c.defaults.minutes,
      reduction: c.defaults.reduction,
      wage: c.defaults.wage,
      other: c.defaults.other,
    };
    setInputs((s) => ({
      ...c.defaults,
      ...effect,
      ...(manualCost || !est?.calibrated ? {} : { initial: s.initial, monthly: s.monthly }),
    }));
  };
  const switchCategory = (k: CategoryKey) => {
    const c = preset.categories.find((x) => x.key === k)!;
    setCatKey(k);
    const effect = kit?.roi?.defaults ?? {
      people: c.defaults.people,
      cases: c.defaults.cases,
      minutes: c.defaults.minutes,
      reduction: c.defaults.reduction,
      wage: c.defaults.wage,
      other: c.defaults.other,
    };
    setInputs((s) => ({
      ...c.defaults,
      ...effect,
      ...(manualCost || !est?.calibrated ? {} : { initial: s.initial, monthly: s.monthly }),
    }));
  };

  const urlArgs = {
    industry: industryId,
    category: catKey,
    inputs,
    kit: kitId,
    answers,
    from: url.from,
    returnUrl: url.returnUrl,
    size: companySize,
    environment,
    memo,
    brand: url.brand,
    ui: url.ui,
  };

  useEffect(() => {
    writeUrl({ ...urlArgs, embed: url.embed });
  }, [industryId, catKey, inputs, answers, url.embed, kitId, url.from, url.returnUrl, companySize, environment, memo, url.brand, url.ui]);

  // ブランド属性（CSS の data-brand 用）
  useEffect(() => {
    document.body.dataset.brand = brand.id;
  }, [brand.id]);

  // 埋め込み時：親フレームに高さを通知
  useEffect(() => {
    if (!url.embed) return;
    document.body.classList.add('embed');
    if (showChrome) document.body.classList.add('embed-full');
    const post = () => {
      window.parent?.postMessage(
        { type: 'roi-simulator:height', height: document.documentElement.scrollHeight },
        '*',
      );
    };
    post();
    const ro = new ResizeObserver(post);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => {
      ro.disconnect();
      document.body.classList.remove('embed-full');
    };
  }, [url.embed, showChrome]);

  const copy = async (text: string, kind: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied(null), 1800);
  };

  const autoFilled = !!est?.calibrated && !manualCost;
  const showFloat = !!kit && !!est?.calibrated && isDesktop && !estInView;

  const scrollToEstimateBlock = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    estimateRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div ref={bodyRef}>
      {showChrome && (
        <>
          <header className="bar">
            <div className="wrap">
              <div className="brand" data-brand={brand.id}>
                {brand.logoSrc ? (
                  <img src={brand.logoSrc} alt={brand.name} className="brand-logo" />
                ) : (
                  <>
                    <span className="dot" />
                    {brand.name}
                  </>
                )}
              </div>
              <div className="tag" title={preset.tag}>{preset.tag}</div>
              {KITS.length > 0 && (
                <button
                  type="button"
                  className="bar-est-btn"
                  aria-pressed={!!kit}
                  onClick={() => (kit ? closeEstimate() : openEstimate())}
                >
                  {kit ? '見積もりを閉じる' : '概算見積もりへ'}
                </button>
              )}
            </div>
          </header>
          <SiteContextBar
            brand={brand}
            from={url.from}
            kitId={kitId}
            returnUrl={url.returnUrl}
          />
          {/* 見積オープン中（デモ直リンク含む）は業界バーを隠す。閉じた後は閲覧モードで表示 */}
          {!kit && (
            <div className="picker" ref={pickerRef}>
              <div className="wrap">
                <span className="lb">業界を選ぶ</span>
                {FEATURED_PRESETS.map((p) => (
                  <button key={p.id} aria-pressed={p.id === industryId}
                          onClick={() => switchIndustry(p.id)}>
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={industryId === OTHER_INDUSTRY_ID}
                  onClick={() => switchIndustry(OTHER_INDUSTRY_ID)}
                >
                  その他
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* kit.hero があるデモ直リンク: 先頭で業種ヒーローではなく kit 文言を出す */}
      {kitHeroActive && (
        <section className="hero hero-kit">
          <div className="wrap">
            <div className="eyebrow">{heroCopy.eyebrow}</div>
            <h1>
              {heroCopy.title.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </h1>
            <p className="lead">{heroCopy.lead}</p>
          </div>
        </section>
      )}

      {url.embed && !showChrome && !kit && KITS.length > 0 && (
        <div className="est-launch embed-launch kit-hub">
          <div className="wrap">
            <div className="kit-hub-head">
              <div className="eyebrow">概算見積もり</div>
              <h2 className="kit-hub-title">作りたいものを選んでください</h2>
              <p className="kit-hub-lead">質問に答えると、開発費の目安が出ます。</p>
            </div>
            <div className="kit-hub-grid">
              {KITS.filter((k) => k.id !== 'webapp').map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="kit-hub-card"
                  onClick={() => openEstimate(k.id)}
                >
                  <span className="kit-hub-name">{k.name}</span>
                  <span className="kit-hub-summary">{k.summary}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="kit-hub-other"
              onClick={() => openEstimate('webapp')}
            >
              一覧に近いものが無い（汎用の業務システムで概算）
            </button>
            <p className="kit-hub-other-hint">
              概算のあと、やりたいことの一言を残せます（金額には使いません）。
            </p>
          </div>
        </div>
      )}

      <div ref={estimateRef}>
        {kit && est && (
          <>
            {!estimateDeepLink && (
            <div
              className={`kit-picker${!kitId ? ' hint-pulse hint-pulse-kit' : ''}`}
              ref={kitPickerRef}
            >
              <div className="wrap">
                <span className="lb">見積もる内容</span>
                {KITS.filter((k) => k.id !== 'webapp').map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={k.id === kitId}
                    onClick={() => {
                      setAnswers({});
                      openEstimate(k.id);
                    }}
                  >
                    {k.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="kit-other"
                  aria-pressed={kitId === 'webapp'}
                  onClick={() => {
                    setAnswers({});
                    openEstimate('webapp');
                  }}
                >
                  近いものが無い
                </button>
                <button type="button" className="kit-close" onClick={closeEstimate}>
                  閉じる
                </button>
              </div>
            </div>
            )}
            {/* 共通コンテキスト: フルUIでは常時。minimal embed は URL 指定時のみ反映（UIは最短のため非表示） */}
            {showChrome && (
              <div className="ctx-picker">
                <div className="wrap">
                  <div className={`ctx-row${!companySize ? ' hint-pulse hint-pulse-0' : ''}`}>
                    <span className="lb">会社規模</span>
                    {SIZE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={companySize === o.value}
                        onClick={() =>
                          setCompanySize((cur) => (cur === o.value ? null : o.value))
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`ctx-row${
                      companySize && !environment ? ' hint-pulse hint-pulse-1' : ''
                    }`}
                  >
                    <span className="lb">使用環境</span>
                    {ENV_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={environment === o.value}
                        onClick={() =>
                          setEnvironment((cur) => (cur === o.value ? null : o.value))
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {ctxNotes.length > 0 && (
                    <div className="ctx-notes">
                      {ctxNotes.map((n) => (
                        <span key={n}>{n}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={wizardAnchorRef} className="wizard-anchor">
            <EstimateWizard
              kit={kit}
              answers={answers}
              est={est}
              industryName={preset.name}
              companySize={companySize}
              environment={environment}
              industryId={industryId}
              fromHint={url.from}
              memo={memo}
              onMemoChange={(v) => setMemo(clampMemo(v))}
              memoMaxLength={MEMO_MAX_LENGTH}
              contextNotes={!showChrome ? ctxNotes : []}
              contextInteractive
              onScrollToPickers={
                estimateDeepLink
                  ? undefined
                  : () => {
                      const target = !showChrome ? kitPickerRef.current : pickerRef.current;
                      (target ?? kitPickerRef.current)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
              }
              onAnswer={(qid, value) =>
                setAnswers((a) => ({ ...a, [qid]: a[qid] === value ? '' : value }))
              }
              onReset={() => setAnswers({})}
            />
            </div>
          </>
        )}
      </div>

      {/* 通常入場のヒーロー（kit.hero 時は先頭に出したので重複させない） */}
      {!kitHeroActive && (
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">{heroCopy.eyebrow}</div>
          <h1>
            {heroCopy.title.split('\n').map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </h1>
          <p className="lead">{heroCopy.lead}</p>
          {!kit && KITS.length > 0 && (
            <div className="est-launch hero-launch">
              <button type="button" className="est-launch-btn" onClick={() => openEstimate()}>
                概算見積もりへ
              </button>
              <span className="est-launch-hint">質問に答えると、開発費の目安が出ます</span>
            </div>
          )}
          <div className="tabs" role="tablist" aria-label="部署カテゴリ">
            {preset.categories.map((c) => (
              <button key={c.key} className="tab" role="tab"
                      aria-selected={c.key === catKey}
                      onClick={() => switchCategory(c.key)}>
                {c.label}<small>{c.sub}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      <div className="main">
        <div className="wrap">
          <div className="grid">
            <div className="panel">
              <div className="ph"><span className="num">1</span><h2>かんたん入力</h2></div>
              <div className="pb">
                <Slider label={roiCopy.peopleLabel} value={inputs.people} unit="人"
                        min={1} max={300} onChange={set('people')} />
                <Slider label={roiCopy.casesLabel} value={inputs.cases} unit="件"
                        min={1} max={200} onChange={set('cases')} />
                <Slider label={roiCopy.minutesLabel} value={inputs.minutes} unit="分"
                        min={1} max={240} onChange={set('minutes')} />
                <Slider label={roiCopy.reductionLabel} value={inputs.reduction} unit="%"
                        min={10} max={99} onChange={set('reduction')}
                        hint={roiCopy.reductionHint} />
                <Money label="1時間あたりの人件費" value={inputs.wage} suffix="円/時" step={100}
                       hint="月給÷160時間の目安。一般職なら2,000〜3,500円。"
                       onChange={set('wage')} />
                <Money label={roiCopy.otherLabel} value={inputs.other} suffix="円/年"
                       hint={roiCopy.otherHint} onChange={set('other')} />

                {autoFilled && (
                  <div className="autobadge">
                    ↓ 上の概算見積もり（上限）から自動入力しています。手で直すと自動入力は止まります。
                  </div>
                )}
                <Money label="導入の初期費用" value={inputs.initial} suffix="円"
                       onChange={set('initial')} />
                <Money label="毎月の利用料" value={inputs.monthly} suffix="円/月" step={10000}
                       onChange={set('monthly')} />
                {manualCost && est?.calibrated && (
                  <button className="relink" onClick={() => setManualCost(false)}>
                    概算見積もりの金額に戻す
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="savebar">
                <div className="row">
                  <div className="blk">
                    <div className="k">いまの作業時間</div>
                    <div className="before">{fmtInt(result.hoursBefore)}時間/月</div>
                  </div>
                  <div className="arrow">→</div>
                  <div className="blk">
                    <div className="k">導入後</div>
                    <div className="after">{fmtInt(result.hoursAfter)}時間/月</div>
                  </div>
                  <div className="cut">
                    <div className="big">−{fmtInt(result.hoursSaved)}時間</div>
                    <div className="lab">毎月、これだけ作業時間が減る</div>
                  </div>
                </div>
              </div>

              <div className="kpis">
                <div className="kpi">
                  <div className="kl">年間の効果額</div>
                  <div className="kv">{fmtMan(result.annualEffect)}<span className="u">万円</span></div>
                  <div className="kn">浮いた時間＋その他効果</div>
                </div>
                <div className="kpi">
                  <div className="kl">投資額（初年度）</div>
                  <div className="kv">{fmtMan(result.investYear)}<span className="u">万円</span></div>
                  <div className="kn">初期費用＋年間利用料</div>
                </div>
                <div className={`kpi accent${ok ? '' : ' warn'}`}>
                  <div className="kl">元が取れるまで</div>
                  <div className="kv">{pay.value}<span className="u">{pay.unit}</span></div>
                  <div className="kn">{ok ? 'これを過ぎたら利益' : '効果が利用料を下回っています'}</div>
                </div>
                <div className="kpi">
                  <div className="kl">3年の累計利益</div>
                  <div className="kv">{fmtMan(result.profit3y)}<span className="u">万円</span></div>
                  <div className="kn">投資を引いた手残り（ROI {Math.round(result.roi3y)}%）</div>
                </div>
              </div>

              <div className="chartcard">
                <div className="ch-head">
                  <h3>いつ元が取れるか（損益分岐）</h3>
                  <div className="legend">
                    <span><i style={{ background: 'var(--blue)' }} />導入による効果の累計</span>
                    <span><i style={{ background: 'var(--red)' }} />かかるお金の累計</span>
                  </div>
                </div>
                <BreakEvenChart inputs={inputs} result={result} />
                <div className="callout">
                  <div className={`ico${ok ? '' : ' no'}`}>{ok ? '✓' : '!'}</div>
                  <div className="txt">
                    {ok ? (
                      <>導入から <b>{pay.value}{pay.unit}</b> で投資を回収。あとは続けるほど利益が積み上がります。</>
                    ) : (
                      <>いまの条件では、毎月の効果が利用料を下回っています。対象人数・件数・速くなる割合を見直してみてください。</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="summary">
        <div className="wrap">
          <div className="msg"><Rich text={closingCopy} /></div>
          <div className="actions">
            {showChrome && (
              <button className="cta ghost"
                      onClick={() => copy(embedSnippet({ ...urlArgs, ui: 'minimal' }), 'embed')}>
                {copied === 'embed' ? 'コピーしました' : '埋め込みタグをコピー'}
              </button>
            )}
            <button className="cta" onClick={() => copy(shareUrl({ ...urlArgs, ui: 'full' }), 'link')}>
              {copied === 'link' ? 'コピーしました' : 'この試算をリンクで送る'}
            </button>
          </div>
        </div>
      </section>

      <div className="note">
        <div className={url.embed ? 'wrap embed-note' : 'wrap'}>{preset.note}</div>
      </div>

      {est && (
        <EstimateFloat
          visible={showFloat}
          est={est}
          onShow={scrollToEstimateBlock}
        />
      )}
    </div>
  );
}
