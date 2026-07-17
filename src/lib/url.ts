import type { Inputs } from './calc';
import type { Answers } from './estimate';
import type { CategoryKey } from './presets';
import {
  parseCompanySize,
  parseEnvironment,
  type CompanySize,
  type Environment,
} from './context';
import { parseBrand, type BrandId } from './brand';

/** 埋め込み時の UI 密度 */
export type UiMode = 'minimal' | 'full';

export function parseUi(raw: string | null | undefined, embed: boolean): UiMode {
  if (raw === 'full') return 'full';
  if (raw === 'minimal') return 'minimal';
  // embed 時は親がブランドを持つ想定でヘッダー非表示。通常はフル。
  return embed ? 'minimal' : 'full';
}

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

/** 質問の回答は a_<質問id> で持つ（例：a_files=m） */
const ANS_PREFIX = 'a_';

/** 自由記述（金額非連動）。共有・引き継ぎ用 */
export const MEMO_MAX_LENGTH = 200;

export function clampMemo(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.slice(0, MEMO_MAX_LENGTH);
}

export type UrlState = {
  industry: string | null;
  category: CategoryKey | null;
  kit: string | null;
  from: string | null;
  size: CompanySize | null;
  environment: Environment | null;
  memo: string;
  inputs: Partial<Inputs>;
  answers: Answers;
  embed: boolean;
  brand: BrandId;
  ui: UiMode;
};

export function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);

  const inputs: Partial<Inputs> = {};
  for (const [param, key] of Object.entries(MAP)) {
    const raw = q.get(param);
    if (raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
      inputs[key] = Number(raw);
    }
  }

  const answers: Answers = {};
  q.forEach((v, k) => {
    if (k.startsWith(ANS_PREFIX) && v) answers[k.slice(ANS_PREFIX.length)] = v;
  });

  const cat = q.get('cat');
  const embed =
    q.get('embed') === '1' || window.location.pathname.replace(/\/$/, '') === '/embed';
  return {
    industry: q.get('industry'),
    category: cat === 'field' || cat === 'internal' || cat === 'dashboard' ? cat : null,
    kit: q.get('kit'),
    from: q.get('from'),
    size: parseCompanySize(q.get('size')),
    environment: parseEnvironment(q.get('env')),
    memo: clampMemo(q.get('memo')),
    inputs,
    answers,
    embed,
    brand: parseBrand(q.get('brand')),
    ui: parseUi(q.get('ui'), embed),
  };
}

type BuildArgs = {
  industry: string;
  category: CategoryKey;
  inputs: Inputs;
  kit?: string | null;
  answers?: Answers;
  from?: string | null;
  size?: CompanySize | null;
  environment?: Environment | null;
  memo?: string | null;
  embed?: boolean;
  brand?: BrandId | null;
  ui?: UiMode | null;
};

function buildParams({
  industry,
  category,
  inputs,
  kit,
  answers,
  from,
  size,
  environment,
  memo,
  embed,
  brand,
  ui,
}: BuildArgs) {
  const q = new URLSearchParams();
  q.set('industry', industry);
  q.set('cat', category);
  if (kit) q.set('kit', kit);
  if (from) q.set('from', from);
  if (size) q.set('size', size);
  if (environment) q.set('env', environment);
  const memoTrim = clampMemo(memo);
  if (memoTrim) q.set('memo', memoTrim);
  if (brand && brand !== 'axeon') q.set('brand', brand);
  // embed + full のときだけ明示（通常表示は ui 省略で full）
  if (embed && ui === 'full') q.set('ui', 'full');
  if (embed) q.set('embed', '1');
  for (const [param, key] of Object.entries(MAP)) q.set(param, String(inputs[key]));
  if (answers) {
    for (const [qid, val] of Object.entries(answers)) {
      if (val) q.set(ANS_PREFIX + qid, val);
    }
  }
  return q;
}

/** 入力が変わるたびURLに書き戻す（履歴を汚さない） */
export function writeUrl(args: BuildArgs) {
  const q = buildParams(args);
  window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
}

/** 共有用の絶対URL：商談で触った状態をそのまま送れる */
export function shareUrl(args: BuildArgs) {
  const q = buildParams({ ...args, embed: false });
  return `${window.location.origin}/?${q.toString()}`;
}

/** 各デモに貼る埋め込みタグ */
export function embedSnippet(args: BuildArgs) {
  const q = buildParams({ ...args, embed: true });
  return `<iframe src="${window.location.origin}/embed?${q.toString()}"\n  style="width:100%;border:0;border-radius:14px" height="1400" loading="lazy"></iframe>`;
}
