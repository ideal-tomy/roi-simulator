import { useEffect, useState } from 'react';

type SliderProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  onChange: (v: number) => void;
};

export function Slider({ label, value, unit, min, max, step = 1, hint, onChange }: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      <div className="lbl">
        <span className="q">{label}</span>
        <span className="val">
          {value.toLocaleString('ja-JP')}
          <span className="u">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

type MoneyProps = {
  label: string;
  value: number;
  suffix: string;
  step?: number;
  hint?: string;
  onChange: (v: number) => void;
};

/** 入力中の文字列を正規化（先頭の不要な0を落とす。空は空のまま） */
function sanitizeMoneyDraft(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits === '') return '';
  // 先頭ゼロを落とす（"0" 自体は残す）
  const stripped = digits.replace(/^0+(?=\d)/, '');
  return stripped === '' ? '0' : stripped;
}

function formatMoneyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return String(Math.trunc(n));
}

export function Money({ label, value, suffix, step = 100000, hint, onChange }: MoneyProps) {
  const [draft, setDraft] = useState(() => formatMoneyValue(value));
  const [focused, setFocused] = useState(false);

  // 親側（見積自動投入・スライダー等）からの更新を、フォーカス中以外で反映
  useEffect(() => {
    if (!focused) setDraft(formatMoneyValue(value));
  }, [value, focused]);

  const commit = (next: string) => {
    const normalized = sanitizeMoneyDraft(next);
    const n = normalized === '' ? 0 : Math.max(0, Number(normalized) || 0);
    setDraft(formatMoneyValue(n));
    onChange(n);
  };

  return (
    <div className="field">
      <div className="lbl">
        <span className="q">{label}</span>
      </div>
      <div className="money">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={draft}
          aria-label={label}
          data-step={step}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const next = sanitizeMoneyDraft(e.target.value);
            setDraft(next);
            const n = next === '' ? 0 : Math.max(0, Number(next) || 0);
            onChange(n);
          }}
          onBlur={() => {
            setFocused(false);
            commit(draft);
          }}
        />
        <span className="yen">{suffix}</span>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
