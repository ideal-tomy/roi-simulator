import { useEffect, useMemo, useRef, useState } from 'react';
import { calculate, fmtInt, fmtMan, fmtPayback, type Inputs } from './lib/calc';
import { PRESETS, getPreset, type CategoryKey } from './lib/presets';
import { readUrl, writeUrl, shareUrl, embedSnippet } from './lib/url';
import { Slider, Money } from './components/Fields';
import { BreakEvenChart } from './components/BreakEvenChart';

/** **強調** を <b> に変換する軽量マークアップ */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}</>;
}

export default function App() {
  const url = useMemo(() => readUrl(), []);
  const [industryId, setIndustryId] = useState(getPreset(url.industry).id);
  const preset = getPreset(industryId);

  const initialCat: CategoryKey = url.category ?? preset.categories[0].key;
  const [catKey, setCatKey] = useState<CategoryKey>(initialCat);
  const category =
    preset.categories.find((c) => c.key === catKey) ?? preset.categories[0];

  // URLに数字があればそれを優先（＝共有リンクの復元）
  const [inputs, setInputs] = useState<Inputs>({
    ...category.defaults,
    ...url.inputs,
  });

  const [copied, setCopied] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => calculate(inputs), [inputs]);
  const pay = fmtPayback(result.payback);
  const ok = isFinite(result.payback);

  const set = (k: keyof Inputs) => (v: number) => setInputs((s) => ({ ...s, [k]: v }));

  // 業界／カテゴリを変えたらプリセット値を流し込む
  const switchIndustry = (id: string) => {
    const p = getPreset(id);
    const c = p.categories.find((x) => x.key === catKey) ?? p.categories[0];
    setIndustryId(id);
    setCatKey(c.key);
    setInputs(c.defaults);
  };
  const switchCategory = (k: CategoryKey) => {
    const c = preset.categories.find((x) => x.key === k)!;
    setCatKey(k);
    setInputs(c.defaults);
  };

  // 入力が変わるたびURLに書き戻す → そのままリンクで共有できる
  useEffect(() => {
    writeUrl(industryId, catKey, inputs, url.embed);
  }, [industryId, catKey, inputs, url.embed]);

  // 埋め込み時：親フレームに高さを通知（親側で高さ自動調整が可能）
  useEffect(() => {
    if (!url.embed) return;
    document.body.classList.add('embed');
    const post = () => {
      const h = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: 'roi-simulator:height', height: h }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, [url.embed]);

  const copy = async (text: string, kind: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied('failed');
      setTimeout(() => setCopied(null), 1800);
    }
  };

  return (
    <div ref={bodyRef}>
      {!url.embed && (
        <>
          <header className="bar">
            <div className="wrap">
              <div className="brand"><span className="dot" />AXEON</div>
              <div className="tag">{preset.tag}</div>
            </div>
          </header>
          <div className="picker">
            <div className="wrap">
              <span className="lb">業界を選ぶ</span>
              {PRESETS.map((p) => (
                <button key={p.id} aria-pressed={p.id === industryId}
                        onClick={() => switchIndustry(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">{category.eyebrow}</div>
          <h1>
            {category.title.split('\n').map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </h1>
          <p className="lead">{category.lead}</p>
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

      <div className="main">
        <div className="wrap">
          <div className="grid">
            <div className="panel">
              <div className="ph"><span className="num">1</span><h2>かんたん入力</h2></div>
              <div className="pb">
                <Slider label="この作業をする人は何人？" value={inputs.people} unit="人"
                        min={1} max={300} onChange={set('people')} />
                <Slider label="1人が1ヶ月に何件こなす？" value={inputs.cases} unit="件"
                        min={1} max={200} onChange={set('cases')} />
                <Slider label="1件にだいたい何分かかる？" value={inputs.minutes} unit="分"
                        min={1} max={240} onChange={set('minutes')} />
                <Slider label="導入でどれくらい速くなる？" value={inputs.reduction} unit="%"
                        min={10} max={99} onChange={set('reduction')}
                        hint="「探す・書く」時間がどれだけ消えるか。迷ったら70〜80%でOK。" />
                <Money label="1時間あたりの人件費" value={inputs.wage} suffix="円/時" step={100}
                       hint="月給÷160時間の目安。一般職なら2,000〜3,500円。"
                       onChange={set('wage')} />
                <Money label={category.otherLabel} value={inputs.other} suffix="円/年"
                       hint={category.otherHint} onChange={set('other')} />
                <Money label="導入の初期費用" value={inputs.initial} suffix="円" onChange={set('initial')} />
                <Money label="毎月の利用料" value={inputs.monthly} suffix="円/月" step={10000}
                       onChange={set('monthly')} />
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
                    <div className="lab">毎月、これだけ手が空く</div>
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
                    <span><i style={{ background: 'var(--blue)' }} />導入で得する累計</span>
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
          <div className="msg"><Rich text={category.summary} /></div>
          <div className="actions">
            {!url.embed && (
              <button className="cta ghost"
                      onClick={() => copy(embedSnippet(industryId, catKey, inputs), 'embed')}>
                {copied === 'embed' ? '埋め込みタグをコピーしました' : '埋め込みタグをコピー'}
              </button>
            )}
            <button className="cta"
                    onClick={() => copy(shareUrl(industryId, catKey, inputs), 'link')}>
              {copied === 'link' ? 'リンクをコピーしました' : 'この試算をリンクで送る'}
            </button>
          </div>
        </div>
      </section>

      <div className="note">
        <div className={url.embed ? 'wrap embed-note' : 'wrap'}>{preset.note}</div>
      </div>
    </div>
  );
}
