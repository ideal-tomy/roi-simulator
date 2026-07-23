import type { Brand } from '../lib/brand';
import { demoLinksForKit } from '../data/demoLinks';

type Props = {
  brand: Brand;
  from: string | null;
  kitId: string | null;
  returnUrl?: string | null;
};

/**
 * 自社サイトから入場したときだけ出す導線バー。
 * from=ideal-site & brand=ideal
 * return があれば homeUrl 配下のときそれを戻り先にする。
 */
function resolveBackHref(
  home: string | undefined,
  returnUrl: string | null | undefined,
): string | null {
  if (!home) return null;
  const homeBase = home.replace(/\/$/, '');

  if (!returnUrl?.trim()) {
    return `${homeBase}/estimate`;
  }

  const raw = returnUrl.trim();
  try {
    if (raw.startsWith('/')) {
      return `${homeBase}${raw}`;
    }
    const u = new URL(raw);
    const homeOrigin = new URL(homeBase).origin;
    if (u.origin !== homeOrigin) return `${homeBase}/estimate`;
    return u.toString();
  } catch {
    return `${homeBase}/estimate`;
  }
}

function backLabel(href: string, home: string): string {
  try {
    const path = new URL(href).pathname.replace(/\/$/, '') || '/';
    if (path.startsWith('/how-we-work')) {
      return '← 相談〜導入の進め方に戻る';
    }
    if (path.startsWith('/estimate')) {
      return '← 自動見積もりに戻る';
    }
    if (path.startsWith('/cases')) {
      return '← 活用イメージに戻る';
    }
  } catch {
    /* fall through */
  }
  void home;
  return '← ideal サイトに戻る';
}

export function SiteContextBar({ brand, from, kitId, returnUrl }: Props) {
  if (brand.id !== 'ideal' || from !== 'ideal-site') return null;

  const home = brand.homeUrl?.replace(/\/$/, '');
  const backHref = resolveBackHref(home, returnUrl);
  const demos = demoLinksForKit(kitId).slice(0, 4);

  return (
    <div className="site-context-bar" role="navigation" aria-label="サイト導線">
      <div className="wrap site-context-inner">
        {backHref && home ? (
          <a className="site-context-back" href={backHref}>
            {backLabel(backHref, home)}
          </a>
        ) : null}
        <div className="site-context-demos">
          <span className="site-context-lb">デモを体験する</span>
          {demos.map((d) => (
            <a key={d.id} className="site-context-demo" href={d.href}>
              {d.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
