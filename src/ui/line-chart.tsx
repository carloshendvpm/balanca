import { useMemo, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import type { Point } from '@/core/series';
import { useTheme } from '@/hooks/use-theme';

import { T } from './kit';

export interface GoalLine {
  value: number;
  label: string;
}

interface Props {
  raw: Point[]; // individual readings, drawn as small dots
  trend: Point[]; // 7-day average, drawn as the line
  goals?: GoalLine[];
  format(v: number): string;
  height?: number;
  color?: string;
}

const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

function niceTicks(lo: number, hi: number, count = 4) {
  const span = hi - lo || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

const fmtDate = (t: number, withYear = false) =>
  new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...(withYear ? { year: '2-digit' } : {}) });

export function LineChart({ raw, trend, goals = [], format, height = 220, color }: Props) {
  const c = useTheme();
  const stroke = color ?? c.accent;
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!raw.length || !width) return null;
    const values = [...raw.map((p) => p.v), ...goals.map((g) => g.value)];
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.1, 0.5);
    lo -= pad;
    hi += pad;
    const t0 = raw[0].t;
    const t1 = raw[raw.length - 1].t === t0 ? t0 + 86_400_000 : raw[raw.length - 1].t;
    const w = width - PAD.left - PAD.right;
    const h = height - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * w;
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * h;
    return { x, y, lo, hi, t0, t1, w, h };
  }, [raw, goals, width, height]);

  if (!raw.length) {
    return (
      <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <T tone="textMuted">Sem dados no período</T>
      </View>
    );
  }

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pick = (e: GestureResponderEvent) => {
    if (!geo) return;
    const lx = e.nativeEvent.locationX;
    let best = 0;
    for (let i = 1; i < raw.length; i++) if (Math.abs(geo.x(raw[i].t) - lx) < Math.abs(geo.x(raw[best].t) - lx)) best = i;
    setHover(best);
  };

  const line = geo && trend.map((p, i) => `${i ? 'L' : 'M'}${geo.x(p.t).toFixed(1)},${geo.y(p.v).toFixed(1)}`).join('');
  const spansYears = geo && new Date(geo.t0).getFullYear() !== new Date(geo.t1).getFullYear();
  const xTicks = geo ? [0, 0.5, 1].map((f) => geo.t0 + f * (geo.t1 - geo.t0)) : [];
  const h = hover !== null ? raw[hover] : null;
  const hTrend = h && trend.find((p) => p.t === h.t);

  return (
    <View>
      <View
        onLayout={onLayout}
        style={{ height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setHover(null)}
        onResponderTerminate={() => setHover(null)}
        // Web: hover without pressing.
        {...({ onMouseMove: (e: any) => pick({ nativeEvent: { locationX: e.nativeEvent.offsetX } } as any), onMouseLeave: () => setHover(null) } as object)}>
        {geo && (
          <Svg width={width} height={height}>
            {niceTicks(geo.lo, geo.hi).map((v) => (
              <G key={v}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke={c.separator} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={geo.y(v) + 4} fontSize={10} fill={c.textMuted} textAnchor="end">
                  {Number(v.toFixed(1)).toLocaleString('pt-BR')}
                </SvgText>
              </G>
            ))}
            {xTicks.map((t, i) => (
              <SvgText
                key={i}
                x={geo.x(t)}
                y={height - 6}
                fontSize={10}
                fill={c.textMuted}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
                {fmtDate(t, !!spansYears)}
              </SvgText>
            ))}
            {goals.map((g, i) => (
              <G key={i}>
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.y(g.value)}
                  y2={geo.y(g.value)}
                  stroke={c.textSecondary}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText x={width - PAD.right} y={geo.y(g.value) - 4} fontSize={10} fill={c.textSecondary} textAnchor="end">
                  {g.label}
                </SvgText>
              </G>
            ))}
            {raw.map((p) => (
              <Circle key={p.t} cx={geo.x(p.t)} cy={geo.y(p.v)} r={2.5} fill={c.textMuted} opacity={0.6} />
            ))}
            {line && <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            {h && (
              <G>
                <Line x1={geo.x(h.t)} x2={geo.x(h.t)} y1={PAD.top} y2={height - PAD.bottom} stroke={c.textMuted} strokeWidth={1} />
                <Circle cx={geo.x(h.t)} cy={geo.y(h.v)} r={5} fill={stroke} stroke={c.card} strokeWidth={2} />
              </G>
            )}
          </Svg>
        )}
      </View>
      <View style={{ minHeight: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
        {h ? (
          <T variant="caption" tone="textSecondary">
            {new Date(h.t).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
            <T variant="caption">{format(h.v)}</T>
            {hTrend ? ` · média 7d ${format(hTrend.v)}` : ''}
          </T>
        ) : (
          <T variant="caption" tone="textMuted">
            ● pesagens   ━ média de 7 dias{goals.length ? '   ┅ metas' : ''}
          </T>
        )}
      </View>
    </View>
  );
}
