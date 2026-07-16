import { series, fmtMan, type Inputs, type Result } from '../lib/calc';

/** 損益分岐グラフ：青（効果の累計）が赤（費用の累計）を追い越す点＝回収 */
export function BreakEvenChart({ inputs, result }: { inputs: Inputs; result: Result }) {
  const W = 720, H = 320, padL = 58, padR = 24, padT = 22, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const { payback } = result;
  const months = Math.min(
    60,
    isFinite(payback) ? Math.max(12, Math.ceil(payback * 1.6)) : 24,
  );

  const pts = series(inputs, months);
  const last = pts[pts.length - 1];
  const yMax = Math.max(last.cost, last.benefit, 1) * 1.08;

  const X = (m: number) => padL + (m / months) * plotW;
  const Y = (v: number) => padT + plotH - (v / yMax) * plotH;

  const gy = Array.from({ length: 5 }, (_, i) => {
    const v = (yMax / 4) * i;
    return { y: Y(v), v };
  });
  const stepX = Math.ceil(months / 6);
  const gx: number[] = [];
  for (let m = 0; m <= months; m += stepX) gx.push(m);
  if (gx[gx.length - 1] !== months) gx.push(months);

  const costLine = pts.map((p) => `${X(p.m)},${Y(p.cost)}`).join(' ');
  const beneLine = pts.map((p) => `${X(p.m)},${Y(p.benefit)}`).join(' ');

  const showMarker = isFinite(payback) && payback <= months;
  const px = showMarker ? X(payback) : 0;
  const py = showMarker ? Y(inputs.initial + inputs.monthly * payback) : 0;
  const label = payback < 1 ? '1ヶ月未満で回収' : `${Math.round(payback * 10) / 10}ヶ月で回収`;
  const lx = Math.min(px + 10, padL + plotW - 118);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
         role="img" aria-label={`損益分岐グラフ。${showMarker ? label : '現条件では回収に至りません'}`}>
      {showMarker && (
        <rect x={px} y={padT} width={padL + plotW - px} height={plotH}
              fill="var(--green)" opacity="0.07" />
      )}
      {gy.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={padL + plotW} y2={g.y} stroke="var(--line)" strokeWidth={1} />
          <text x={padL - 10} y={g.y + 4} textAnchor="end" fontSize={11} fill="var(--sub)">
            {fmtMan(g.v)}万
          </text>
        </g>
      ))}
      {gx.map((m) => (
        <text key={m} x={X(m)} y={padT + plotH + 22} textAnchor="middle" fontSize={11} fill="var(--sub)">
          {m}ヶ月
        </text>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--line)" strokeWidth={1.5} />
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="var(--line)" strokeWidth={1.5} />
      <polyline points={costLine} fill="none" stroke="var(--red)" strokeWidth={3} strokeLinejoin="round" />
      <polyline points={beneLine} fill="none" stroke="var(--blue)" strokeWidth={3.5} strokeLinejoin="round" />
      {showMarker && (
        <>
          <line x1={px} y1={padT} x2={px} y2={padT + plotH} stroke="var(--green)" strokeWidth={1.5} strokeDasharray="4 4" />
          <circle cx={px} cy={py} r={6.5} fill="#fff" stroke="var(--green)" strokeWidth={3} />
          <g transform={`translate(${lx},${padT + 8})`}>
            <rect x={0} y={0} width={118} height={24} rx={6} fill="var(--green)" />
            <text x={59} y={16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
              {label}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}
