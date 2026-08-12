export interface ParentalGateChallenge {
  question: string;
  answer: number;
}

function randomInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Two-digit × one-digit multiplication — the standard "parental gate" pattern used across kids
 * apps to block a young child from reaching commerce (distinct from COPPA age-screening, where
 * the FTC considers a math question alone insufficient; here the app already knows it's talking
 * to a child, the gate just needs to filter out this app's 5-6yo target age band, which hasn't
 * learned multiplication yet, while staying trivial for an adult).
 */
export function generateChallenge(random: () => number = Math.random): ParentalGateChallenge {
  const a = randomInt(12, 19, random);
  const b = randomInt(3, 9, random);
  return { question: `${a} × ${b}`, answer: a * b };
}
