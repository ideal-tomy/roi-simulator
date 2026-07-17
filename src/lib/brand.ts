/** 社名・ロゴだけの切替。計算・kit・業種には触れない。 */

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
};

export const BRANDS: Record<BrandId, Brand> = {
  axeon: {
    id: 'axeon',
    name: 'AXEON',
    // logoSrc: '/brands/axeon.svg',
  },
  ideal: {
    id: 'ideal',
    name: 'ideal',
    // logoSrc: '/brands/ideal.svg',
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
  return BRANDS[id];
}
