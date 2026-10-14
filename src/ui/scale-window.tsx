import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Display } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  value: number; // kg under the index line
  raw?: number | null; // latest reading, drawn as a dot on the band
  goals?: { value: number; label: string }[];
}

const HEIGHT = 76;
const VISIBLE_KG = 8; // span shown inside the window
const BAND_KG = 16; // band drawn wider than the window so it can slide in

/**
 * The window of an analog bathroom scale: a numbered band slides under a red
 * index line that marks the trend weight. Goals sit on the band as flags.
 */
export function ScaleWindow({ value, raw, goals = [] }: Props) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) return slide.setValue(0);
      slide.setValue(1);
      Animated.timing(slide, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [width, value, slide]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pxPerKg = width / VISIBLE_KG;
  const bandWidth = pxPerKg * BAND_KG;
  const left = value - BAND_KG / 2; // kg at the band's left edge
  const x = (kg: number) => (kg - left) * pxPerKg;

  const ticks: { kg: number; major: boolean; half: boolean }[] = [];
  for (let t = Math.ceil(left * 10); t <= (left + BAND_KG) * 10; t++) {
    ticks.push({ kg: t / 10, major: t % 10 === 0, half: t % 5 === 0 });
  }
  // Goals outside the window: show only the nearest one on each side.
  const outside = goals.filter((g) => Math.abs(g.value - value) > VISIBLE_KG / 2 - 0.3);
  const nearest = (side: number) =>
    outside.filter((g) => Math.sign(g.value - value) === side).sort((a, b) => Math.abs(a.value - value) - Math.abs(b.value - value))[0];
  const offscreen = [nearest(-1), nearest(1)].filter((g): g is { value: number; label: string } => !!g);

  return (
    <View
      onLayout={onLayout}
      style={[styles.window, { backgroundColor: c.card, borderColor: c.separator }]}
      accessibilityRole="image"
      accessibilityLabel={`Ponteiro em ${value.toFixed(1)} quilos`}>
      {width > 0 && (
        <>
          <Animated.View
            style={{
              position: 'absolute',
              left: width / 2 - bandWidth / 2,
              top: 0,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, pxPerKg * 2.5] }) }],
            }}>
            <Svg width={bandWidth} height={HEIGHT}>
              {ticks.map(({ kg, major, half }) => (
                <Line
                  key={kg}
                  x1={x(kg)}
                  x2={x(kg)}
                  y1={0}
                  y2={major ? 22 : half ? 15 : 9}
                  stroke={major ? c.text : c.textMuted}
                  strokeWidth={major ? 1.5 : 1}
                />
              ))}
              {ticks
                .filter((t) => t.major)
                .map(({ kg }) => (
                  <SvgText key={`n${kg}`} x={x(kg)} y={44} fontSize={18} fontFamily={Display.medium} fill={c.text} textAnchor="middle">
                    {kg.toFixed(0)}
                  </SvgText>
                ))}
              {goals.map((g, i) => (
                <G key={i}>
                  <Line x1={x(g.value)} x2={x(g.value)} y1={50} y2={HEIGHT} stroke={c.accent} strokeWidth={1.5} />
                  <Path d={`M${x(g.value)},50 l9,4 l-9,4 z`} fill={c.accent} />
                </G>
              ))}
              {raw != null && <Circle cx={x(raw)} cy={HEIGHT - 10} r={3.5} fill={c.textSecondary} />}
            </Svg>
          </Animated.View>

          {/* Fixed overlay: soft edges and the red index line. */}
          <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="fadeL" x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={c.card} stopOpacity={1} />
                <Stop offset="1" stopColor={c.card} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="fadeR" x1="1" x2="0" y1="0" y2="0">
                <Stop offset="0" stopColor={c.card} stopOpacity={1} />
                <Stop offset="1" stopColor={c.card} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width * 0.18} height={HEIGHT} fill="url(#fadeL)" />
            <Rect x={width * 0.82} y={0} width={width * 0.18} height={HEIGHT} fill="url(#fadeR)" />
            <Line x1={width / 2} x2={width / 2} y1={0} y2={HEIGHT} stroke={c.needle} strokeWidth={2} />
            <Path d={`M${width / 2 - 6},0 h12 l-6,8 z`} fill={c.needle} />
          </Svg>
        </>
      )}
      {offscreen.length > 0 && width > 0 && (
        <View style={[styles.offscreen, { flexDirection: 'row', justifyContent: 'space-between' }]} pointerEvents="none">
          {offscreen.map((g, i) => {
            const below = g.value < value;
            return (
              <Animated.Text
                key={i}
                style={[styles.offLabel, { color: c.accent, marginLeft: below ? 0 : 'auto', backgroundColor: c.card }]}>
                {below ? `◂ ${g.label}` : `${g.label} ▸`}
              </Animated.Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  window: { height: HEIGHT, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  offscreen: { position: 'absolute', left: 8, right: 8, bottom: 4 },
  offLabel: { fontSize: 12, fontWeight: '600' },
});
