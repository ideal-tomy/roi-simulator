/* 概算に入りきらない／上振れしやすい要素（説明用・金額計算には使わない） */

import type { Answers } from './estimate';
import type { CompanySize, Environment } from './context';

export type ScopeFactor = {
  id: string;
  /** 結果カード用の短いラベル */
  label: string;
  /** アコーディオン用の一文 */
  detail: string;
};

/** 開閉リスト（計算非連動） */
export const SCOPE_FACTORS: ScopeFactor[] = [
  {
    id: 'integration-depth',
    label: '既存システムとの本格連携',
    detail: '基幹や複数システムとの API・権限・データ整合まで含む場合',
  },
  {
    id: 'governance',
    label: '社内審査・監査の厚さ',
    detail: '情シス審査、監査ログ、社内標準への適合が重い場合',
  },
  {
    id: 'scale-beyond',
    label: '画面・権限の規模',
    detail: '画面数やロールが、この概算の想定を大きく超える場合',
  },
  {
    id: 'migration-quality',
    label: 'データ移行の量・品質',
    detail: '移行データが多い、またはクレンジングが必要な場合',
  },
  {
    id: 'infra-lock',
    label: '指定インフラ・閉域',
    detail: '指定クラウド、国内必須、オンプレ・閉域などで制約が強い場合',
  },
  {
    id: 'rollout',
    label: '導入の進め方',
    detail: '全社一斉切替や既存業務の全面置き換えなど、段階導入では済まない場合',
  },
];

export type ScopeFactorInput = {
  answers: Answers;
  size: CompanySize | null;
  environment: Environment | null;
  industryId?: string | null;
};

/**
 * 結果カード向け。回答・コンテキストから最大3件。
 * 足りなければ汎用の上振れ要因で埋める。
 */
export function pickHighlightFactors(input: ScopeFactorInput, limit = 3): ScopeFactor[] {
  const picked: ScopeFactor[] = [];
  const seen = new Set<string>();

  const push = (f: ScopeFactor | undefined) => {
    if (!f || seen.has(f.id) || picked.length >= limit) return;
    seen.add(f.id);
    picked.push(f);
  };

  const byId = (id: string) => SCOPE_FACTORS.find((f) => f.id === id);

  const { answers, size, environment, industryId } = input;

  if (environment === 'onprem' || environment === 'jp') push(byId('infra-lock'));
  if (size === 'l') {
    push({
      id: 'org-scale',
      label: '中堅以上の導入範囲',
      detail: '組織規模が大きく、関係部署・展開範囲が広い場合',
    });
  }
  if (industryId === 'nursing' || industryId === 'professional') {
    push({
      id: 'sensitive-data',
      label: '個人情報・機密の扱い',
      detail: '要配慮情報や機密データを扱う前提が厚い場合',
    });
  }

  const a = answers;
  if (a.integration === 'api' || a.integration === 'yes' || a.integration === 'complex') {
    push(byId('integration-depth'));
  }
  if (a.auth === 'roles' || a.security === 'strict' || a.security === 'high' || a.security === 'yes') {
    push(byId('governance'));
  }
  if (a.screens === 'l' || a.customize === 'full') {
    push(byId('scale-beyond'));
  }
  if (a.migrate === 'yes') {
    push(byId('migration-quality'));
  }
  if (a.sla === 'strict') {
    push({
      id: 'availability',
      label: '高い稼働・可用性',
      detail: '止まると困る前提で、監視・冗長などを厚くする場合',
    });
  }

  // 埋め: 汎用の上振れ要因（この概算の外にあるもの）
  for (const f of SCOPE_FACTORS) {
    push(f);
    if (picked.length >= limit) break;
  }

  return picked;
}
