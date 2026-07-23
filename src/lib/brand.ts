/** 社名・ロゴ・締め文・見た目・サイト導線。計算・kit・業種ロジックには触れない。 */

export type BrandId = 'axeon' | 'ideal';

export type Brand = {
  id: BrandId;
  /** ヘッダー表示名 */
  name: string;
  /**
   * 任意。`public/brands/` に画像を置いたらパスを書く。
   * 未設定時はドット＋社名テキストのみ。
   */
  logoSrc?: string;
  /**
   * フッター締め文（`**強調**` 可）。
   * 優先度: kit.closing → brand.closing → 業種カテゴリ summary
   */
  closing?: string;
  /**
   * 自社サイトのオリジン（末尾スラッシュなし）。
   * `from=ideal-site` 時の「サイトに戻る」先。
   */
  homeUrl?: string;
};

const IDEAL_HOME_DEFAULT = 'https://ideal-official-three.vercel.app';

export const BRANDS: Record<BrandId, Brand> = {
  axeon: {
    id: 'axeon',
    name: 'AXEON',
    // logoSrc: '/brands/axeon.svg',
    // AXEON は業種カテゴリ summary をそのまま使う（closing 未設定）
  },
  ideal: {
    id: 'ideal',
    name: 'ideal',
    // logoSrc: '/brands/ideal.svg',
    closing: '現場の手間を、**本業と決断の時間**に変える。',
    homeUrl: IDEAL_HOME_DEFAULT,
  },
};

export const DEFAULT_BRAND_ID: BrandId = 'axeon';

export function parseBrand(raw: string | null | undefined): BrandId {
  if (raw === 'ideal' || raw === 'axeon') return raw;
  const fromEnv = import.meta.env.VITE_DEFAULT_BRAND;
  if (fromEnv === 'ideal' || fromEnv === 'axeon') return fromEnv;
  return DEFAULT_BRAND_ID;
}

export function getBrand(id: BrandId): Brand {
  const base = BRANDS[id];
  if (id !== 'ideal') return base;
  const override = import.meta.env.VITE_IDEAL_SITE_URL?.replace(/\/$/, '');
  if (!override) return base;
  return { ...base, homeUrl: override };
}
