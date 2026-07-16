import type { Kit } from './estimate';

/** src/data/kits/*.json を自動収集（デモを足す＝JSONを1個置くだけ・import不要） */
const modules = import.meta.glob<{ default: Kit }>('../data/kits/*.json', { eager: true });

export const KITS: Kit[] = Object.values(modules).map((m) => m.default);

export const getKit = (id: string | null): Kit | null =>
  KITS.find((k) => k.id === id) ?? null;
