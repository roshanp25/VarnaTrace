import { generateChallenge } from '../generateChallenge';

describe('generateChallenge', () => {
  it('produces a question whose stated multiplication equals the answer', () => {
    for (let i = 0; i < 50; i++) {
      const { question, answer } = generateChallenge();
      const [a, b] = question.split('×').map((n) => Number(n.trim()));
      expect(a * b).toBe(answer);
    }
  });

  it('keeps the first factor two-digit (12-19) and the second single-digit (3-9)', () => {
    for (let i = 0; i < 50; i++) {
      const { question } = generateChallenge();
      const [a, b] = question.split('×').map((n) => Number(n.trim()));
      expect(a).toBeGreaterThanOrEqual(12);
      expect(a).toBeLessThanOrEqual(19);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
    }
  });

  it('is deterministic given a fixed random source', () => {
    const fixedRandom = () => 0;
    expect(generateChallenge(fixedRandom)).toEqual({ question: '12 × 3', answer: 36 });
  });
});
