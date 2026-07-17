/* 共通コンテキスト（業種以外）：会社規模・使用環境 → 見積係数 */

export type CompanySize = 's' | 'm' | 'l';
export type Environment = 'cloud' | 'jp' | 'onprem';

export type EstimateContext = {
  size: CompanySize | null;
  environment: Environment | null;
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

/** 会社規模係数（未回答は range: 小〜大） */
const SIZE_FACTOR: Record<CompanySize, number> = {
  s: 1,
  m: 1.08,
  l: 1.18,
};

/** 使用環境係数（未回答は high: オンプレ前提） */
const ENV_FACTOR: Record<Environment, number> = {
  cloud: 1,
  jp: 1.12,
  onprem: 1.35,
};

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

  return {
    low: sizeLow * env,
    high: sizeHigh * env,
  };
}

export function contextNotes(ctx: EstimateContext): string[] {
  const notes: string[] = [];
  if (!ctx.size) notes.push('会社規模未選択のため、規模の幅を広めに見ています');
  if (!ctx.environment) notes.push('使用環境未選択のため、オンプレ・閉域前提で計算中');
  else if (ctx.environment === 'onprem') notes.push('オンプレ・閉域は難易度が高くなります');
  else if (ctx.environment === 'jp') notes.push('指定クラウド・国内要件を係数に反映しています');
  return notes;
}
