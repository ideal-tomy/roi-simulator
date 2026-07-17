import type { Inputs } from './calc';

export type CategoryKey = 'field' | 'internal' | 'dashboard';

export type Category = {
  key: CategoryKey;
  label: string;      // タブ名（例：現場・報告）
  sub: string;        // タブ補足（例：現場報告を簡略化する）
  eyebrow: string;    // 見出し上の小ラベル
  title: string;      // 悩みの見出し（\n で改行）
  lead: string;       // 悩みの説明
  otherLabel: string; // 業界ごとの主レバー名
  otherHint: string;
  summary: string;    // 締めの一文（**強調** が使える）
  defaults: Inputs;
};

export type Preset = {
  id: string;         // URL: ?industry=construction
  name: string;       // 業界名
  tag: string;        // ヘッダー右のモデル表記
  note: string;       // フッターの但し書き
  categories: Category[];
};

/** src/data/presets/*.json を全て自動で取り込む（新業界はJSONを1つ置くだけ） */
const modules = import.meta.glob<{ default: Preset }>('../data/presets/*.json', {
  eager: true,
});

/** セレクター主要表示順（金額影響帯・需要を意識） */
export const FEATURED_INDUSTRY_IDS = [
  'construction',
  'manufacturing',
  'electrical',
  'logistics',
  'nursing',
  'professional',
] as const;

export const OTHER_INDUSTRY_ID = 'other';

export const PRESETS: Preset[] = Object.values(modules).map((m) => m.default);

export const getPreset = (id: string | null): Preset =>
  PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === 'construction') ?? PRESETS[0];

export const FEATURED_PRESETS: Preset[] = FEATURED_INDUSTRY_IDS.map(
  (id) => PRESETS.find((p) => p.id === id),
).filter((p): p is Preset => !!p);

export const OTHER_PRESET: Preset | undefined = PRESETS.find((p) => p.id === OTHER_INDUSTRY_ID);
