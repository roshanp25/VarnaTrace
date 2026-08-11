import { useEffect, useRef, useState } from 'react';

import { MultiStrokeScoreResult, Point, scoreMultiStrokeTrace, StencilPath } from '../../engine';

import { TracingCanvas } from './TracingCanvas';

export interface MultiStrokeTracingCanvasProps {
  /** The strokes to trace, in order, each in the coordinate space defined by `viewBoxSize`. */
  strokes: StencilPath[];
  viewBoxSize?: number;
  /** Rendered side length (in DP) of the square canvas. */
  size: number;
  /** Called once, after the last stroke's finger/Pencil lift, with the combined score. */
  onComplete: (result: MultiStrokeScoreResult) => void;
}

/**
 * Sequences a child through a character's strokes one at a time, using TracingCanvas as the
 * single-stroke drawing surface for whichever stroke is currently active. Previously finished
 * strokes stay visible (solid) and the remaining strokes' guides stay visible (faint), so the
 * child can see the whole character coming together.
 *
 * This component owns its stroke-sequencing state internally and does not reset it if `strokes`
 * changes under it — callers switching to a different character (or retrying the same one) must
 * remount it via a changing `key` (e.g. tied to the character's id), per React's own guidance to
 * prefer remounting over resetting state in an effect.
 */
export function MultiStrokeTracingCanvas({
  strokes,
  viewBoxSize,
  size,
  onComplete,
}: MultiStrokeTracingCanvasProps) {
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  // TracingCanvas's onComplete prop only reflects our latest closure once a passive effect has
  // flushed — and effects run asynchronously, so they aren't guaranteed to have run between two
  // touch events that fire in quick succession. So the values a completed stroke depends on
  // (accumulated points, which stroke we're on) are tracked here in refs, written synchronously
  // inside the same event-handler calls that update the mirrored state (state exists purely to
  // drive rendering), instead of being read from component state or an effect-synced snapshot.
  const currentPointsRef = useRef<Point[]>([]);
  const completedStrokesRef = useRef<Point[][]>([]);
  const strokeIndexRef = useRef(0);

  const latestOnComplete = useRef(onComplete);
  useEffect(() => {
    latestOnComplete.current = onComplete;
  });

  const handleTracedPointsChange = (points: Point[]) => {
    currentPointsRef.current = points;
    setCurrentPoints(points);
  };

  // This function is only ever invoked later, from a real touch-release event, never
  // synchronously during render (see TracingCanvas's identical rationale for the same pattern).
  const [handleStrokeComplete] = useState(() => () => {
    const updatedStrokes = [...completedStrokesRef.current, currentPointsRef.current];
    completedStrokesRef.current = updatedStrokes;
    currentPointsRef.current = [];
    setCompletedStrokes(updatedStrokes);
    setCurrentPoints([]);

    if (strokeIndexRef.current + 1 < strokes.length) {
      strokeIndexRef.current += 1;
      setStrokeIndex(strokeIndexRef.current);
    } else {
      latestOnComplete.current(scoreMultiStrokeTrace(strokes, updatedStrokes));
    }
  });

  const otherStencilGuides = strokes.filter((_, i) => i !== strokeIndex);

  return (
    <TracingCanvas
      stencil={strokes[strokeIndex]}
      viewBoxSize={viewBoxSize}
      size={size}
      tracedPoints={currentPoints}
      onTracedPointsChange={handleTracedPointsChange}
      onComplete={handleStrokeComplete}
      completedStrokes={completedStrokes}
      otherStencilGuides={otherStencilGuides}
    />
  );
}
