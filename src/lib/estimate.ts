import type { EstimateContext } from './context';
import { contextFactors } from './context';
import type { KitRoiProfile } from './roiProfile';

/* =========================================================================
   見積もりエンジン：質問への回答 → 開発費レンジ（UI非依存）
   ・未回答の質問:
       unansweredMode "range"（既定）→ 最安／最高の両端で幅を広げる
       unansweredMode "high"         → 重い方を両端に固定（安い見積事故を防ぐ）
   ・optional: true の質問は UI で任意表示（エンジンは全問を計算に使う）
   ・人日・単価が未設定（0）のうちは calibrated=false を返し、金額を出させない
   ・共通コンテキスト（規模・環境・業種帯）は最終金額に係数として掛ける
   ========================================================================= */

export type KitOption = {
  value: string;
  label: string;
  days?: number;       // 人日の加算（省略時 0）
  factor?: number;     // 係数の乗算（省略時 1）
  monthlyAdd?: number; // 月額の加算（円・省略時 0）
};

export type KitQuestion = {
  id: string;
  label: string;
  hint?: string;
  /** true なら UI で「追加回答」枠に入れる（計算には常に参加） */
  optional?: boolean;
  /**
   * 未回答時の扱い。
   * - range: 最安〜最高で幅を広げる（精度UP用）
   * - high:  重い方を両端に固定（情シス審査・データ持ち込みなど）
   */
  unansweredMode?: 'range' | 'high';
  options: KitOption[];
};

export type Kit = {
  id: string;            // URL: ?kit=chatbot
  name: string;
  summary: string;
  unitPrice: number;     // 人日単価（円）
  setupFee: number;      // 土台利用料（円）※再利用資産の対価
  baseDays: number;      // デモ流用でも残る最低人日
  monthly: {
    infra: number;           // インフラ月額（円）
    usage: number;           // AI従量など月額（円）
    maintenanceRate: number; // 保守：開発費に対する年率（0.12 = 年12%）
  };
  rangeSpread: { low: number; high: number }; // 全問回答時でも残る見積もり誤差
  questions: KitQuestion[];
  /** かんたん入力（ROI）のラベル・初期値。無い場合は業種カテゴリにフォールバック */
  roi?: KitRoiProfile;
  /**
   * デモ／kit 直リンク時のヒーロー文言。
   * ある場合は業種カテゴリの eyebrow/title/lead より優先（今後キットごとに足す）。
   */
  hero?: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  /**
   * フッター締め文（`**強調**` 可）。
   * ある場合は brand.closing / 業種カテゴリ summary より優先。
   */
  closing?: string;
};

export type Answers = Record<string, string>;

export type Estimate = {
  calibrated: boolean;  // 人日・単価が設定済みか
  answered: number;
  total: number;
  basicAnswered: number;
  basicTotal: number;
  daysLow: number;
  daysHigh: number;
  devLow: number;       // 開発費レンジ下限
  devHigh: number;      // 開発費レンジ上限 ← ROIにはこちら（高い方）を渡す
  monthlyLow: number;
  monthlyHigh: number;
};

function optionDays(o: KitOption) {
  return o.days ?? 0;
}
function optionFactor(o: KitOption) {
  return o.factor ?? 1;
}
function optionMonthly(o: KitOption) {
  return o.monthlyAdd ?? 0;
}

export function estimate(
  kit: Kit,
  answers: Answers,
  ctx: EstimateContext = { size: null, environment: null, industryId: null },
): Estimate {
  // 単価・土台人日が未設定なら金額を出さない（¥0を客に見せる事故を防ぐ）
  const calibrated = kit.unitPrice > 0 && kit.baseDays > 0;

  let daysLow = kit.baseDays;
  let daysHigh = kit.baseDays;
  let facLow = 1;
  let facHigh = 1;
  let monthlyAddLow = 0;
  let monthlyAddHigh = 0;
  let answered = 0;
  let basicAnswered = 0;
  let basicTotal = 0;

  for (const q of kit.questions) {
    const isBasic = !q.optional;
    if (isBasic) basicTotal++;

    const sel = q.options.find((o) => o.value === answers[q.id]);
    if (sel) {
      answered++;
      if (isBasic) basicAnswered++;
      daysLow += optionDays(sel);
      daysHigh += optionDays(sel);
      facLow *= optionFactor(sel);
      facHigh *= optionFactor(sel);
      monthlyAddLow += optionMonthly(sel);
      monthlyAddHigh += optionMonthly(sel);
      continue;
    }

    const ds = q.options.map(optionDays);
    const fs = q.options.map(optionFactor);
    const ms = q.options.map(optionMonthly);
    const mode = q.unansweredMode ?? 'range';

    if (mode === 'high') {
      // 未回答＝重い方固定（下限も楽観に落とさない）
      const d = Math.max(...ds);
      const f = Math.max(...fs);
      const m = Math.max(...ms);
      daysLow += d;
      daysHigh += d;
      facLow *= f;
      facHigh *= f;
      monthlyAddLow += m;
      monthlyAddHigh += m;
    } else {
      // 未回答＝最安／最高の両端（レンジが広がる）
      daysLow += Math.min(...ds);
      daysHigh += Math.max(...ds);
      facLow *= Math.min(...fs);
      facHigh *= Math.max(...fs);
      monthlyAddLow += Math.min(...ms);
      monthlyAddHigh += Math.max(...ms);
    }
  }

  const totalDaysLow = daysLow * facLow;
  const totalDaysHigh = daysHigh * facHigh;

  const rawLow = totalDaysLow * kit.unitPrice + kit.setupFee;
  const rawHigh = totalDaysHigh * kit.unitPrice + kit.setupFee;

  const cf = contextFactors(ctx);
  const devLow = rawLow * kit.rangeSpread.low * cf.low;
  const devHigh = rawHigh * kit.rangeSpread.high * cf.high;

  const monthlyOf = (dev: number, monthlyAdd: number) =>
    kit.monthly.infra +
    kit.monthly.usage +
    monthlyAdd +
    (dev * kit.monthly.maintenanceRate) / 12;

  return {
    calibrated,
    answered,
    total: kit.questions.length,
    basicAnswered,
    basicTotal,
    daysLow: totalDaysLow,
    daysHigh: totalDaysHigh,
    devLow,
    devHigh,
    monthlyLow: monthlyOf(devLow, monthlyAddLow),
    monthlyHigh: monthlyOf(devHigh, monthlyAddHigh),
  };
}
