import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Point, scoreTrace, StencilPath, TraceScoreResult } from '../../engine';
import { Colors } from '../../shared/theme';

import { pointsToSvgPath } from './svgPath';

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
}

const DEFAULT_VIEW_BOX_SIZE = 300;

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
  traceColor = '#3478f6',
}: TracingCanvasProps) {
  const strokePoints = useRef<Point[]>([]);

  // The PanResponder below is created exactly once; its gesture handlers read the latest props
  // through this ref (updated via effect, never during render) instead of closing over the props
  // directly, so a long-lived touch gesture never acts on stale values.
  const latest = useRef({ stencil, size, viewBoxSize, onTracedPointsChange, onComplete });
  useEffect(() => {
    latest.current = { stencil, size, viewBoxSize, onTracedPointsChange, onComplete };
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
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        strokePoints.current = [toStencilSpace(event)];
        latest.current.onTracedPointsChange(strokePoints.current.slice());
      },
      onPanResponderMove: (event) => {
        strokePoints.current.push(toStencilSpace(event));
        latest.current.onTracedPointsChange(strokePoints.current.slice());
      },
      onPanResponderRelease: () => {
        const result = scoreTrace(latest.current.stencil, strokePoints.current);
        latest.current.onComplete(result);
      },
    }),
  );

  const viewBox = useMemo(() => `0 0 ${viewBoxSize} ${viewBoxSize}`, [viewBoxSize]);
  const guideStrokeWidth = viewBoxSize * 0.03;
  const traceStrokeWidth = viewBoxSize * 0.035;

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
          <Path
            key={`other-guide-${i}`}
            d={pointsToSvgPath(guide)}
            stroke="#c7c7cc"
            strokeOpacity={0.4}
            strokeWidth={guideStrokeWidth}
            strokeDasharray={`${guideStrokeWidth} ${guideStrokeWidth}`}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        <Path
          d={pointsToSvgPath(stencil)}
          stroke="#c7c7cc"
          strokeWidth={guideStrokeWidth}
          strokeDasharray={`${guideStrokeWidth} ${guideStrokeWidth}`}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {completedStrokes.map((strokePointsForPath, i) => (
          <Path
            key={`completed-${i}`}
            d={pointsToSvgPath(strokePointsForPath)}
            stroke={traceColor}
            strokeWidth={traceStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {tracedPoints.length > 0 && (
          <Path
            d={pointsToSvgPath(tracedPoints)}
            stroke={traceColor}
            strokeWidth={traceStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
        {tracedPoints.length === 0 && stencil.length > 0 && (
          <Circle cx={stencil[0].x} cy={stencil[0].y} r={viewBoxSize * 0.025} fill={Colors.numbers} />
        )}
      </Svg>
    </View>
  );
}
