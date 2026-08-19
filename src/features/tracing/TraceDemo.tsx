import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Polygon } from 'react-native-svg';

import { Point, resamplePathByArcLength, StencilPath } from '../../engine';

export interface TraceDemoProps {
  /** The character's strokes, in order — the same data the child is about to trace. */
  strokes: StencilPath[];
  /** Rendered side length (in DP) of the square canvas this overlays. */
  size: number;
  /** Side length of the square coordinate space `strokes` is authored in. */
  viewBoxSize: number;
  /** Color of the arrow — pass the same traceColor the child's own line will use. */
  color: string;
  /** Called once, after the arrow has traced every stroke. */
  onComplete: () => void;
}

/** Points the resampled path is sampled to for smooth arrow motion. */
const SAMPLE_COUNT = 60;

/** How long the arrow takes to travel one stroke, regardless of the stroke's length. */
const DURATION_PER_STROKE_MS = 1100;

/** Pause between strokes, so a multi-stroke character reads as distinct pen-lifts, not one blur. */
const PAUSE_BETWEEN_STROKES_MS = 350;

interface MarkerState {
  x: number;
  y: number;
  /** Degrees, matching SVG's rotate() convention (clockwise, 0 = pointing along +X). */
  angle: number;
}

function markerAt(samples: Point[], t: number): MarkerState {
  const lastIndex = samples.length - 1;
  const index = Math.min(Math.floor(t * lastIndex), lastIndex - 1);
  const current = samples[index];
  const next = samples[index + 1];
  const angle = (Math.atan2(next.y - current.y, next.x - current.x) * 180) / Math.PI;
  const segmentT = t * lastIndex - index;

  return {
    x: current.x + (next.x - current.x) * segmentT,
    y: current.y + (next.y - current.y) * segmentT,
    angle,
  };
}

/**
 * Plays a small arrowhead traveling along each stroke of a character in order, at constant speed
 * per stroke, to show a child which direction to draw before they try it themselves. Purely a
 * visual overlay — renders on top of TracingCanvas, which should be given `disabled` while this
 * plays so a stray touch can't start a real stroke underneath the demo.
 */
export function TraceDemo({ strokes, size, viewBoxSize, color, onComplete }: TraceDemoProps) {
  const [marker, setMarker] = useState<MarkerState | null>(null);

  const latestOnComplete = useRef(onComplete);
  useEffect(() => {
    latestOnComplete.current = onComplete;
  });

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const playStroke = (strokeIndex: number) => {
      if (cancelled) {
        return;
      }
      if (strokeIndex >= strokes.length) {
        setMarker(null);
        latestOnComplete.current();
        return;
      }

      const samples = resamplePathByArcLength(strokes[strokeIndex], SAMPLE_COUNT);
      const startedAt = Date.now();

      const tick = () => {
        if (cancelled) {
          return;
        }
        const t = Math.min((Date.now() - startedAt) / DURATION_PER_STROKE_MS, 1);
        setMarker(markerAt(samples, t));

        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          timeoutId = setTimeout(() => playStroke(strokeIndex + 1), PAUSE_BETWEEN_STROKES_MS);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    playStroke(0);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // Runs once for this component's lifetime: the parent only mounts TraceDemo while one
    // character's demo is playing and remounts (fresh strokes) rather than updating props in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!marker) {
    return null;
  }

  const arrowSize = viewBoxSize * 0.035;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <G transform={`translate(${marker.x} ${marker.y}) rotate(${marker.angle})`}>
          <Polygon
            points={`${arrowSize},0 ${-arrowSize * 0.6},${arrowSize * 0.65} ${-arrowSize * 0.6},${-arrowSize * 0.65}`}
            fill={color}
            stroke="#ffffff"
            strokeWidth={viewBoxSize * 0.006}
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    pointerEvents: 'none',
  },
});
