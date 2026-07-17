/* 共通コンテキスト：会社規模・使用環境・業種帯 → 見積係数 */

export type CompanySize = 's' | 'm' | 'l';
export type Environment = 'cloud' | 'jp' | 'onprem';

export type EstimateContext = {
  size: CompanySize | null;
  environment: Environment | null;
  /** preset id。未指定・未知は標準帯 */
  industryId?: string | null;
};

export const SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: 's', label: '〜50人' },
  { value: 'm', label: '51〜300人' },
  { value: 'l', label: '301人以上' },
];

export const ENV_OPTIONS: { value: Environment; label: string; hint?: string }[] = [
  { value: 'cloud', label: 'クラウド標準' },
  { value: 'jp', label: '指定クラウド・国内必須' },
  { value: 'onprem', label: 'オンプレ・閉域' },
];

/** 会社規模係数（未回答は range: 小〜大）— S3 本決め */
const SIZE_FACTOR: Record<CompanySize, number> = {
  s: 1,
  m: 1.1,
  l: 1.22,
};

/** 使用環境係数（未回答は high: オンプレ前提）— S3 本決め */
const ENV_FACTOR: Record<Environment, number> = {
  cloud: 1,
  jp: 1.15,
  onprem: 1.4,
};

/**
 * 業種帯の見積係数（S3 本決め）。
 * 介護・医療は上限厚め、士業はやや高め、その他は中立。
 */
const INDUSTRY_FACTOR: Record<string, { low: number; high: number }> = {
  construction: { low: 1, high: 1 },
  manufacturing: { low: 1, high: 1 },
  electrical: { low: 1, high: 1 },
  logistics: { low: 1, high: 1 },
  nursing: { low: 1.12, high: 1.28 },
  professional: { low: 1.06, high: 1.14 },
  other: { low: 1, high: 1 },
};

const INDUSTRY_DEFAULT = { low: 1, high: 1 };

/** 検証・ドキュメント用に公開（計算は contextFactors 経由） */
export function getIndustryFactor(industryId: string | null | undefined): { low: number; high: number } {
  if (!industryId) return INDUSTRY_DEFAULT;
  return INDUSTRY_FACTOR[industryId] ?? INDUSTRY_DEFAULT;
}

export function parseCompanySize(raw: string | null): CompanySize | null {
  return raw === 's' || raw === 'm' || raw === 'l' ? raw : null;
}

export function parseEnvironment(raw: string | null): Environment | null {
  return raw === 'cloud' || raw === 'jp' || raw === 'onprem' ? raw : null;
}

export function contextFactors(ctx: EstimateContext): { low: number; high: number } {
  const sizeLow = ctx.size ? SIZE_FACTOR[ctx.size] : SIZE_FACTOR.s;
  const sizeHigh = ctx.size ? SIZE_FACTOR[ctx.size] : SIZE_FACTOR.l;

  // 環境未回答＝重い方固定（安い見積事故を防ぐ）
  const env = ctx.environment ? ENV_FACTOR[ctx.environment] : ENV_FACTOR.onprem;
  const ind = getIndustryFactor(ctx.industryId);

  return {
    low: sizeLow * env * ind.low,
    high: sizeHigh * env * ind.high,
  };
}

export function contextNotes(ctx: EstimateContext): string[] {
  const notes: string[] = [];
  if (!ctx.size) notes.push('会社規模未選択のため、規模の幅を広めに見ています');
  if (!ctx.environment) notes.push('使用環境未選択のため、オンプレ・閉域前提で計算中');
  else if (ctx.environment === 'onprem') notes.push('オンプレ・閉域は難易度が高くなります');
  else if (ctx.environment === 'jp') notes.push('指定クラウド・国内要件を係数に反映しています');

  if (ctx.industryId === 'nursing') {
    notes.push('介護・医療は個人情報・要配慮情報の前提で上限を厚めに見ています');
  } else if (ctx.industryId === 'professional') {
    notes.push('士業は顧客機密・権限の前提でやや高めに見ています');
  }

  return notes;
}
