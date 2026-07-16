/* =========================================================================
   エンジン層：試算ロジック（UI非依存・ここが全業界/全デモで共有される中核）
   仕様変更はこのファイルだけ。プリセットや見た目は一切ここに書かない。
   ========================================================================= */

/** ユーザーが入力する8項目 */
export type Inputs = {
  people: number;    // 対象人数
  cases: number;     // 1人あたり月間件数
  minutes: number;   // 1件あたりの所要分
  reduction: number; // 削減率（%）
  wage: number;      // 時給（円）
  other: number;     // その他の年間効果（円／業界ごとの主レバー）
  initial: number;   // 初期費用（円）
  monthly: number;   // 月額利用料（円）
};

/** 試算結果 */
export type Result = {
  hoursBefore: number;   // 導入前の月間作業時間
  hoursAfter: number;    // 導入後の月間作業時間
  hoursSaved: number;    // 月間削減時間
  monthlyGross: number;  // 月間効果額（人件費換算＋その他）
  monthlyNet: number;    // 月間純効果（利用料差引後）
  annualEffect: number;  // 年間効果額
  investYear: number;    // 初年度投資額（初期＋年間利用料）
  payback: number;       // 回収期間（月）／回収不能は Infinity
  profit3y: number;      // 3年累計利益
  roi3y: number;         // 3年ROI（%）
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * 回収期間の定義：初期費用 ÷（月間効果額 − 月額利用料）
 * 月額は「効果から先に引く」方式（ランニングは効果を目減りさせるもの、と捉える）
 */
export function calculate(i: Inputs): Result {
  const monthlyCases = i.people * i.cases;
  const hoursBefore = (monthlyCases * i.minutes) / 60;
  const hoursSaved = (hoursBefore * i.reduction) / 100;
  const hoursAfter = hoursBefore - hoursSaved;

  const monthlyLabor = hoursSaved * i.wage;
  const monthlyOther = (i.other || 0) / 12;
  const monthlyGross = monthlyLabor + monthlyOther;
  const monthlyNet = monthlyGross - (i.monthly || 0);

  const annualEffect = monthlyGross * 12;
  const investYear = (i.initial || 0) + (i.monthly || 0) * 12;
  const payback = monthlyNet > 0 ? (i.initial || 0) / monthlyNet : Infinity;
  const profit3y = monthlyNet * 36 - (i.initial || 0);
  const invest3y = (i.initial || 0) + (i.monthly || 0) * 36;
  const roi3y = invest3y > 0 ? (profit3y / invest3y) * 100 : 0;

  return {
    hoursBefore, hoursAfter, hoursSaved,
    monthlyGross, monthlyNet, annualEffect,
    investYear, payback, profit3y, roi3y,
  };
}

/** グラフ用：月ごとの累計費用・累計効果 */
export function series(i: Inputs, months: number) {
  const cost = (m: number) => (i.initial || 0) + (i.monthly || 0) * m;
  const benefit = (m: number) => calculate(i).monthlyGross * m;
  const pts: { m: number; cost: number; benefit: number }[] = [];
  for (let m = 0; m <= months; m++) pts.push({ m, cost: cost(m), benefit: benefit(m) });
  return pts;
}

/** 表示用フォーマッタ */
export const fmtMan = (yen: number): string => {
  const m = yen / 10000;
  if (Math.abs(m) >= 100) return Math.round(m).toLocaleString('ja-JP');
  return (Math.round(m * 10) / 10).toLocaleString('ja-JP');
};
export const fmtInt = (n: number): string => Math.round(n).toLocaleString('ja-JP');
export const fmtPayback = (p: number): { value: string; unit: string } =>
  !isFinite(p) ? { value: '—', unit: '' }
    : p < 1 ? { value: '1', unit: 'ヶ月未満' }
    : { value: String(Math.round(p * 10) / 10), unit: 'ヶ月' };
