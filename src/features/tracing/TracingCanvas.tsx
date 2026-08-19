import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Point, ScoringOptions, scoreTrace, StencilPath, TraceScoreResult } from '../../engine';
import { Colors } from '../../shared/theme';

import { isDotStroke, pointsToSvgPath } from './svgPath';

export interface TracingCanvasProps {
  /** The reference path to trace, in the coordinate space defined by `viewBoxSize`. */
  stencil: StencilPath;
  /** Side length of the square coordinate space the stencil is authored in. */
  viewBoxSize?: number;
  /** Rendered side length (in DP) of the square canvas. */
  size: number;
  /** Current traced points, in stencil coordinate space. Owned by the parent (controlled component). */
  tracedPoints: Point[];
  onTracedPointsChange: (points: Point[]) => void;
  /** Called once, when the finger/Pencil lifts, with the score for the completed trace. */
  onComplete: (result: TraceScoreResult) => void;
  /** Already-finished strokes of a multi-stroke character, rendered solid beneath the active trace. */
  completedStrokes?: Point[][];
  /** Other strokes of a multi-stroke character not active yet, rendered as faint guides. */
  otherStencilGuides?: StencilPath[];
  /** Color of the child's drawn line and completed strokes. */
  traceColor?: string;
  /**
   * Brief encouraging text to fade in over the canvas, e.g. after a weak stroke triggers a
   * silent redo. Not a modal — renders non-interactively over the drawing surface and never
   * blocks input; the caller controls how long it stays visible by clearing it back to null.
   */
  hintText?: string | null;
  /** Forwarded to scoreTrace on release; omit to use the engine's own defaults. */
  scoringOptions?: ScoringOptions;
  /** While true, all touch input is ignored. */
  disabled?: boolean;
  /**
   * Multiplies the rendered guide/trace line width — purely visual, does not affect scoring.
   * Lets a difficulty mode's surface look (and feel) more forgiving without loosening what
   * actually passes. Defaults to 1 (no change).
   */
  strokeWidthMultiplier?: number;
}

export const DEFAULT_VIEW_BOX_SIZE = 300;
export const DEFAULT_TRACE_COLOR = '#3478f6';

interface StrokeShapeProps {
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity?: number;
  dasharray?: string;
}

/**
 * Renders one stroke as a dashed/solid line, except a genuine single-tap "dot" stroke (see
 * `isDotStroke`) — `pointsToSvgPath` would draw those as an invisible zero-length path, so they
 * get an explicit Circle instead.
 */
function StrokeShape({ points, color, strokeWidth, opacity, dasharray }: StrokeShapeProps) {
  if (points.length === 0) {
    return null;
  }
  if (isDotStroke(points)) {
    return <Circle cx={points[0].x} cy={points[0].y} r={strokeWidth / 2} fill={color} opacity={opacity} />;
  }
  return (
    <Path
      d={pointsToSvgPath(points)}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      strokeDasharray={dasharray}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/**
 * A tracing surface: renders a dashed stencil guide plus the child's in-progress stroke, and
 * scores the stroke via the engine when the finger/Pencil lifts. Touch and Apple Pencil input are
 * handled identically here — only point coordinates matter for scoring, not input type.
 */
export function TracingCanvas({
  stencil,
  viewBoxSize = DEFAULT_VIEW_BOX_SIZE,
  size,
  tracedPoints,
  onTracedPointsChange,
  onComplete,
  completedStrokes = [],
  otherStencilGuides = [],
  traceColor = DEFAULT_TRACE_COLOR,
  hintText = null,
  scoringOptions,
  disabled = false,
  strokeWidthMultiplier = 1,
}: TracingCanvasProps) {
  const strokePoints = useRef<Point[]>([]);

  const [hintOpacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(hintOpacity, {
      toValue: hintText ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [hintText, hintOpacity]);

  // The PanResponder below is created exactly once; its gesture handlers read the latest props
  // through this ref (updated via effect, never during render) instead of closing over the props
  // directly, so a long-lived touch gesture never acts on stale values.
  const latest = useRef({
    stencil,
    size,
    viewBoxSize,
    onTracedPointsChange,
    onComplete,
    scoringOptions,
    disabled,
  });
  useEffect(() => {
    latest.current = {
      stencil,
      size,
      viewBoxSize,
      onTracedPointsChange,
      onComplete,
      scoringOptions,
      disabled,
    };
  });

  const toStencilSpace = (event: GestureResponderEvent): Point => {
    const { size: currentSize, viewBoxSize: currentViewBoxSize } = latest.current;
    const scale = currentViewBoxSize / currentSize;
    const { locationX, locationY } = event.nativeEvent;
    return { x: locationX * scale, y: locationY * scale };
  };

  // PanResponder's own API requires building its callbacks once and reading refs only when those
  // callbacks later fire from real touch events, never synchronously here; the lint rule can't
  // distinguish that from an unsafe render-time read.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (event) => {
        strokePoints.current = [toStencilSpace(event)];
        latest.current.onTracedPointsChange(strokePoints.current.slice());
      },
      onPanResponderMove: (event) => {
        strokePoints.current.push(toStencilSpace(event));
        latest.current.onTracedPointsChange(strokePoints.current.slice());
      },
      onPanResponderRelease: () => {
        const result = scoreTrace(
          latest.current.stencil,
          strokePoints.current,
          latest.current.scoringOptions,
        );
        latest.current.onComplete(result);
      },
    }),
  );

  const viewBox = useMemo(() => `0 0 ${viewBoxSize} ${viewBoxSize}`, [viewBoxSize]);
  const guideStrokeWidth = viewBoxSize * 0.03 * strokeWidthMultiplier;
  const traceStrokeWidth = viewBoxSize * 0.035 * strokeWidthMultiplier;

  return (
    <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
      <Svg width={size} height={size} viewBox={viewBox}>
        <Line
          x1={viewBoxSize / 2}
          y1={0}
          x2={viewBoxSize / 2}
          y2={viewBoxSize}
          stroke="#000000"
          strokeOpacity={0.08}
          strokeWidth={viewBoxSize * 0.004}
        />
        <Line
          x1={0}
          y1={viewBoxSize / 2}
          x2={viewBoxSize}
          y2={viewBoxSize / 2}
          stroke="#000000"
          strokeOpacity={0.08}
          strokeWidth={viewBoxSize * 0.004}
        />
        {otherStencilGuides.map((guide, i) => (
          <StrokeShape
            key={`other-guide-${i}`}
            points={guide}
            color="#c7c7cc"
            opacity={0.4}
            strokeWidth={guideStrokeWidth}
            dasharray={`${guideStrokeWidth} ${guideStrokeWidth}`}
          />
        ))}
        <StrokeShape
          points={stencil}
          color="#c7c7cc"
          strokeWidth={guideStrokeWidth}
          dasharray={`${guideStrokeWidth} ${guideStrokeWidth}`}
        />
        {completedStrokes.map((strokePointsForPath, i) => (
          <StrokeShape
            key={`completed-${i}`}
            points={strokePointsForPath}
            color={traceColor}
            strokeWidth={traceStrokeWidth}
          />
        ))}
        <StrokeShape points={tracedPoints} color={traceColor} strokeWidth={traceStrokeWidth} />
        {tracedPoints.length === 0 && stencil.length > 0 && (
          <Circle cx={stencil[0].x} cy={stencil[0].y} r={viewBoxSize * 0.025} fill={Colors.numbers} />
        )}
      </Svg>
      {hintText && (
        <Animated.View style={[styles.hintPill, { opacity: hintOpacity }]}>
          <Text style={styles.hintPillText}>{hintText}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hintPill: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: Colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    pointerEvents: 'none',
  },
  hintPillText: {
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '700',
  },
});
