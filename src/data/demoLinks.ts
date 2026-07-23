/** ideal サイト入場時に案内するデモ（外部 URL） */

export type DemoLink = {
  id: string;
  label: string;
  href: string;
  /** 選択中 kit と紐づくとき先頭に出す */
  kits?: string[];
};

export const DEMO_LINKS: DemoLink[] = [
  {
    id: 'shift',
    label: 'シフト管理デモ',
    href: 'https://shift-demo.vercel.app/',
    kits: ['shift-management'],
  },
  {
    id: 'customer-chat',
    label: 'カスタマーサポート',
    href: 'https://customer-support-demo-lime.vercel.app/',
    kits: ['chatbot'],
  },
  {
    id: 'internal-knowledge',
    label: '社内ナレッジAI',
    href: 'https://internal-knowledge-demo.vercel.app/',
    kits: ['chatbot'],
  },
  {
    id: 'manufacturing',
    label: '製造フローデモ',
    href: 'https://product-flow-jet.vercel.app/',
    kits: ['report-auto', 'webapp'],
  },
  {
    id: 'construction',
    label: '建設・現場管理',
    href: 'https://kanri-kensetsu.vercel.app/login',
    kits: ['report-auto'],
  },
  {
    id: 'matching',
    label: '事業者マッチング',
    href: 'https://hookapp-demo.vercel.app/',
  },
];

/** kit に合うものを先頭にした一覧（最大表示は呼び出し側） */
export function demoLinksForKit(kitId: string | null): DemoLink[] {
  if (!kitId) return DEMO_LINKS;
  const matched = DEMO_LINKS.filter((d) => d.kits?.includes(kitId));
  const rest = DEMO_LINKS.filter((d) => !d.kits?.includes(kitId));
  return [...matched, ...rest];
}
