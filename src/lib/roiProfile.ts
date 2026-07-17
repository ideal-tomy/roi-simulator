import type { Inputs } from './calc';
import type { Category } from './presets';
import type { Kit } from './estimate';

/** kit ごとのかんたん入力コピー（計算式は calc.ts のまま） */
export type KitRoiProfile = {
  peopleLabel: string;
  casesLabel: string;
  minutesLabel: string;
  reductionLabel: string;
  reductionHint?: string;
  otherLabel: string;
  otherHint?: string;
  /** 効果側の初期値（initial/monthly は含めない） */
  defaults: Pick<Inputs, 'people' | 'cases' | 'minutes' | 'reduction' | 'wage' | 'other'>;
};

export type RoiCopy = {
  peopleLabel: string;
  casesLabel: string;
  minutesLabel: string;
  reductionLabel: string;
  reductionHint?: string;
  otherLabel: string;
  otherHint?: string;
  defaults: Pick<Inputs, 'people' | 'cases' | 'minutes' | 'reduction' | 'wage' | 'other'>;
  fromKit: boolean;
};

const FALLBACK_LABELS = {
  peopleLabel: 'この作業をする人は何人？',
  casesLabel: '1人が1ヶ月に何件こなす？',
  minutesLabel: '1件にだいたい何分かかる？',
  reductionLabel: '導入でどれくらい速くなる？',
  reductionHint: '「探す・書く」時間がどれだけ消えるか。迷ったら70〜80%でOK。',
};

/** kit.roi があれば優先。なければ業種カテゴリの文言 */
export function getRoiCopy(kit: Kit | null, category: Category): RoiCopy {
  if (kit?.roi) {
    const r = kit.roi;
    return {
      peopleLabel: r.peopleLabel,
      casesLabel: r.casesLabel,
      minutesLabel: r.minutesLabel,
      reductionLabel: r.reductionLabel,
      reductionHint: r.reductionHint,
      otherLabel: r.otherLabel,
      otherHint: r.otherHint,
      defaults: { ...r.defaults },
      fromKit: true,
    };
  }

  return {
    ...FALLBACK_LABELS,
    otherLabel: category.otherLabel,
    otherHint: category.otherHint,
    defaults: {
      people: category.defaults.people,
      cases: category.defaults.cases,
      minutes: category.defaults.minutes,
      reduction: category.defaults.reduction,
      wage: category.defaults.wage,
      other: category.defaults.other,
    },
    fromKit: false,
  };
}
