import type { Inputs } from './calc';
import type { CategoryKey } from './presets';

/* URLパラメータ名（短縮形）と Inputs のキーの対応 */
const MAP: Record<string, keyof Inputs> = {
  people: 'people',
  cases: 'cases',
  min: 'minutes',
  red: 'reduction',
  wage: 'wage',
  other: 'other',
  init: 'initial',
  mo: 'monthly',
};

export type UrlState = {
  industry: string | null;
  category: CategoryKey | null;
  inputs: Partial<Inputs>;
  embed: boolean;
};

/** 現在のURLから状態を読む */
export function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);
  const inputs: Partial<Inputs> = {};
  for (const [param, key] of Object.entries(MAP)) {
    const raw = q.get(param);
    if (raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
      inputs[key] = Number(raw);
    }
  }
  const cat = q.get('cat');
  return {
    industry: q.get('industry'),
    category:
      cat === 'field' || cat === 'internal' || cat === 'dashboard' ? cat : null,
    inputs,
    embed: q.get('embed') === '1' || window.location.pathname.replace(/\/$/, '') === '/embed',
  };
}

/**
 * 入力値をURLに書き戻す（履歴を汚さないよう replaceState）
 * → 商談でスライダーを動かした結果を、そのままURLで送れる
 */
export function writeUrl(
  industry: string,
  category: CategoryKey,
  inputs: Inputs,
  embed: boolean,
) {
  const q = new URLSearchParams();
  q.set('industry', industry);
  q.set('cat', category);
  for (const [param, key] of Object.entries(MAP)) q.set(param, String(inputs[key]));
  if (embed) q.set('embed', '1');
  const path = window.location.pathname;
  window.history.replaceState(null, '', `${path}?${q.toString()}`);
}

/** 共有用の絶対URLを組み立てる */
export function shareUrl(
  industry: string,
  category: CategoryKey,
  inputs: Inputs,
): string {
  const q = new URLSearchParams();
  q.set('industry', industry);
  q.set('cat', category);
  for (const [param, key] of Object.entries(MAP)) q.set(param, String(inputs[key]));
  return `${window.location.origin}/?${q.toString()}`;
}

/** 埋め込み用スニペット（各デモに貼る2行） */
export function embedSnippet(
  industry: string,
  category: CategoryKey,
  inputs: Inputs,
): string {
  const q = new URLSearchParams();
  q.set('industry', industry);
  q.set('cat', category);
  q.set('embed', '1');
  for (const [param, key] of Object.entries(MAP)) q.set(param, String(inputs[key]));
  return `<iframe src="${window.location.origin}/embed?${q.toString()}"\n  style="width:100%;border:0;border-radius:14px" height="1180" loading="lazy"></iframe>`;
}
