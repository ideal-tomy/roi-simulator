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

export function Money({ label, value, suffix, step = 100000, hint, onChange }: MoneyProps) {
  return (
    <div className="field">
      <div className="lbl">
        <span className="q">{label}</span>
      </div>
      <div className="money">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          inputMode="numeric"
          aria-label={label}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        <span className="yen">{suffix}</span>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
