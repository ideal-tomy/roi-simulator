/* =========================================================================
   見積もりエンジン：質問への回答 → 開発費レンジ（UI非依存）
   ・未回答の質問は「最も安い／最も高い」の両端で計算する
     → 答えるほど不確実性が減り、レンジが自然に狭まる（嘘のない仕組み）
   ・人日・単価が未設定（0）のうちは calibrated=false を返し、金額を出させない
   ========================================================================= */

export type KitOption = {
  value: string;
  label: string;
  days?: number;   // 人日の加算（省略時 0）
  factor?: number; // 係数の乗算（省略時 1）
};

export type KitQuestion = {
  id: string;
  label: string;
  hint?: string;
  options: KitOption[];
};

export type Kit = {
  id: string;            // URL: ?kit=chatbot
  name: string;
  summary: string;
  unitPrice: number;     // 人日単価（円）★実績で埋める
  setupFee: number;      // 初期セットアップ費（円）★実績で埋める
  baseDays: number;      // 土台の人日（質問に関係なく必ずかかる）★実績で埋める
  monthly: {
    infra: number;           // インフラ月額（円）
    usage: number;           // AI従量など月額（円）
    maintenanceRate: number; // 保守：開発費に対する年率（0.12 = 年12%）
  };
  rangeSpread: { low: number; high: number }; // 全問回答時でも残る見積もり誤差
  questions: KitQuestion[];
};

export type Answers = Record<string, string>;

export type Estimate = {
  calibrated: boolean;  // 人日・単価が設定済みか
  answered: number;
  total: number;
  daysLow: number;
  daysHigh: number;
  devLow: number;       // 開発費レンジ下限
  devHigh: number;      // 開発費レンジ上限 ← ROIにはこちら（高い方）を渡す
  monthlyLow: number;
  monthlyHigh: number;
};

export function estimate(kit: Kit, answers: Answers): Estimate {
  // 単価・土台人日が未設定なら金額を出さない（¥0を客に見せる事故を防ぐ）
  const calibrated = kit.unitPrice > 0 && kit.baseDays > 0;

  let daysLow = kit.baseDays;
  let daysHigh = kit.baseDays;
  let facLow = 1;
  let facHigh = 1;
  let answered = 0;

  for (const q of kit.questions) {
    const sel = q.options.find((o) => o.value === answers[q.id]);
    if (sel) {
      answered++;
      daysLow += sel.days ?? 0;
      daysHigh += sel.days ?? 0;
      facLow *= sel.factor ?? 1;
      facHigh *= sel.factor ?? 1;
    } else {
      // 未回答 → 最安・最高の両端を採用（レンジが広がる）
      const ds = q.options.map((o) => o.days ?? 0);
      const fs = q.options.map((o) => o.factor ?? 1);
      daysLow += Math.min(...ds);
      daysHigh += Math.max(...ds);
      facLow *= Math.min(...fs);
      facHigh *= Math.max(...fs);
    }
  }

  const totalDaysLow = daysLow * facLow;
  const totalDaysHigh = daysHigh * facHigh;

  const rawLow = totalDaysLow * kit.unitPrice + kit.setupFee;
  const rawHigh = totalDaysHigh * kit.unitPrice + kit.setupFee;

  const devLow = rawLow * kit.rangeSpread.low;
  const devHigh = rawHigh * kit.rangeSpread.high;

  const monthlyOf = (dev: number) =>
    kit.monthly.infra + kit.monthly.usage + (dev * kit.monthly.maintenanceRate) / 12;

  return {
    calibrated,
    answered,
    total: kit.questions.length,
    daysLow: totalDaysLow,
    daysHigh: totalDaysHigh,
    devLow,
    devHigh,
    monthlyLow: monthlyOf(devLow),
    monthlyHigh: monthlyOf(devHigh),
  };
}
