import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  DEFAULT_DIFFICULTY,
  Difficulty,
  DIFFICULTY_CONFIGS,
  MultiStrokeScoreResult,
  Point,
  scoreMultiStrokeTrace,
  StencilPath,
  TraceScoreResult,
} from '../../engine';

import { TraceDemo } from './TraceDemo';
import { DEFAULT_TRACE_COLOR, DEFAULT_VIEW_BOX_SIZE, TracingCanvas } from './TracingCanvas';

export interface MultiStrokeTracingCanvasProps {
  /** The strokes to trace, in order, each in the coordinate space defined by `viewBoxSize`. */
  strokes: StencilPath[];
  viewBoxSize?: number;
  /** Rendered side length (in DP) of the square canvas. */
  size: number;
  /** Called once, after the last stroke's finger/Pencil lift, with the combined score. */
  onComplete: (result: MultiStrokeScoreResult) => void;
  /** Color of the child's drawn line and completed strokes. */
  traceColor?: string;
  /** Notified whenever the active stroke changes, for progress UI outside the canvas. */
  onStrokeIndexChange?: (index: number, total: number) => void;
  /** Governs scoring leniency and the retry mechanic — see DIFFICULTY_CONFIGS. Defaults to DEFAULT_DIFFICULTY. */
  difficulty?: Difficulty;
}

/** Shown briefly over the canvas when a weak stroke triggers a silent redo instead of a hard failure. */
const RETRY_HINT_TEXT = 'Try again!';

/** How long the retry hint stays visible before fading out, in ms. */
const RETRY_HINT_DURATION_MS = 1000;

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
 *
 * When `difficulty`'s config enables `guidedDemo`, an animated arrow (TraceDemo) plays over the
 * canvas on mount, tracing every stroke in order — but the underlying TracingCanvas accepts touch
 * input from the start, not just once the demo finishes; the first real point traced dismisses
 * the demo (see handleTracedPointsChange), so an eager attempt doesn't have to wait it out.
 * Remounting (the same `key` mechanism above) replays it — there's no separate imperative "replay"
 * API. The same TraceDemo also gets re-triggered mid-character, for just the current stroke, if a
 * retried attempt scores below `missDemoThreshold` — a plain "Try again!" pill covers a merely
 * imprecise attempt, but a genuine miss gets the stronger visual reminder instead (see
 * handleStrokeComplete).
 */
export function MultiStrokeTracingCanvas({
  strokes,
  viewBoxSize,
  size,
  onComplete,
  traceColor,
  onStrokeIndexChange,
  difficulty = DEFAULT_DIFFICULTY,
}: MultiStrokeTracingCanvasProps) {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const resolvedViewBoxSize = viewBoxSize ?? DEFAULT_VIEW_BOX_SIZE;
  const resolvedTraceColor = traceColor ?? DEFAULT_TRACE_COLOR;

  const [strokeIndex, setStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [hintText, setHintText] = useState<string | null>(null);
  // Non-null strokes TraceDemo is currently animating: the whole character on mount (when the
  // difficulty enables it — callers wanting a full replay, e.g. a "show me again" button, remount
  // this component via a changing `key`, same as switching characters), or just the current
  // stroke when a miss triggers a targeted replay (see handleStrokeComplete below).
  const [demoStrokes, setDemoStrokes] = useState<StencilPath[] | null>(
    config.guidedDemo ? strokes : null,
  );

  useEffect(() => {
    onStrokeIndexChange?.(strokeIndex, strokes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeIndex, strokes.length]);

  // TracingCanvas's onComplete prop only reflects our latest closure once a passive effect has
  // flushed — and effects run asynchronously, so they aren't guaranteed to have run between two
  // touch events that fire in quick succession. So the values a completed stroke depends on
  // (accumulated points, which stroke we're on) are tracked here in refs, written synchronously
  // inside the same event-handler calls that update the mirrored state (state exists purely to
  // drive rendering), instead of being read from component state or an effect-synced snapshot.
  const currentPointsRef = useRef<Point[]>([]);
  const completedStrokesRef = useRef<Point[][]>([]);
  const strokeIndexRef = useRef(0);
  const strokeAttemptsRef = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const latestOnComplete = useRef(onComplete);
  useEffect(() => {
    latestOnComplete.current = onComplete;
  });

  const handleTracedPointsChange = (points: Point[]) => {
    currentPointsRef.current = points;
    setCurrentPoints(points);
    if (demoStrokes !== null && points.length === 1) {
      // A real stroke just started — don't make them wait for the reference arrow to finish
      // playing. It's served its purpose once the child starts drawing, so get it out of the way.
      setDemoStrokes(null);
    }
  };

  // This function is only ever invoked later, from a real touch-release event, never
  // synchronously during render (see TracingCanvas's identical rationale for the same pattern).
  const [handleStrokeComplete] = useState(() => (result: TraceScoreResult) => {
    const attemptsRemain = strokeAttemptsRef.current + 1 < config.maxStrokeAttempts;
    if (config.retryThreshold !== null && result.score < config.retryThreshold && attemptsRemain) {
      // Weak stroke, tries left: let the child redraw the same stroke instead of baking in a bad
      // score or interrupting with a popup.
      strokeAttemptsRef.current += 1;
      currentPointsRef.current = [];
      setCurrentPoints([]);

      if (config.missDemoThreshold !== null && result.score < config.missDemoThreshold) {
        // Not just imprecise — read as a genuine miss (traced far from the stencil). A pill isn't
        // enough here, so replay the guided arrow for just this one stroke before letting them
        // try again.
        setDemoStrokes([strokes[strokeIndexRef.current]]);
      } else {
        // Merely weak: nudge with a brief, non-blocking hint instead.
        if (hintTimerRef.current) {
          clearTimeout(hintTimerRef.current);
        }
        setHintText(RETRY_HINT_TEXT);
        hintTimerRef.current = setTimeout(() => setHintText(null), RETRY_HINT_DURATION_MS);
      }
      return;
    }

    strokeAttemptsRef.current = 0;
    const updatedStrokes = [...completedStrokesRef.current, currentPointsRef.current];
    completedStrokesRef.current = updatedStrokes;
    currentPointsRef.current = [];
    setCompletedStrokes(updatedStrokes);
    setCurrentPoints([]);

    if (strokeIndexRef.current + 1 < strokes.length) {
      strokeIndexRef.current += 1;
      setStrokeIndex(strokeIndexRef.current);
    } else {
      latestOnComplete.current(scoreMultiStrokeTrace(strokes, updatedStrokes, config.scoring));
    }
  });

  const otherStencilGuides = strokes.filter((_, i) => i !== strokeIndex);

  return (
    <View style={{ width: size, height: size }}>
      <TracingCanvas
        stencil={strokes[strokeIndex]}
        viewBoxSize={viewBoxSize}
        size={size}
        tracedPoints={currentPoints}
        onTracedPointsChange={handleTracedPointsChange}
        onComplete={handleStrokeComplete}
        completedStrokes={completedStrokes}
        otherStencilGuides={otherStencilGuides}
        traceColor={traceColor}
        hintText={hintText}
        scoringOptions={config.scoring}
        strokeWidthMultiplier={config.traceSurfaceWidthMultiplier}
      />
      {demoStrokes && (
        <TraceDemo
          strokes={demoStrokes}
          size={size}
          viewBoxSize={resolvedViewBoxSize}
          color={resolvedTraceColor}
          onComplete={() => setDemoStrokes(null)}
        />
      )}
    </View>
  );
}
