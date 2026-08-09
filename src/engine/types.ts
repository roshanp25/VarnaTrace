export interface Point {
  x: number;
  y: number;
}

/** Ordered points describing the ideal path for a character/number, in a single coordinate space. */
export type StencilPath = Point[];
