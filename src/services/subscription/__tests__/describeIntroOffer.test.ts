import { describeIntroOffer } from '../describeIntroOffer';

describe('describeIntroOffer', () => {
  it('returns null when there is no introductory offer', () => {
    expect(describeIntroOffer(null)).toBeNull();
  });

  it('returns null for a paid intro price, since this app only configures free trials', () => {
    expect(describeIntroOffer({ price: 1.99, periodUnit: 'MONTH', periodNumberOfUnits: 1 })).toBeNull();
  });

  it('describes a 7-day free trial', () => {
    expect(describeIntroOffer({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7 })).toBe(
      '7 days free',
    );
  });

  it('describes a 1-week free trial with singular unit', () => {
    expect(describeIntroOffer({ price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1 })).toBe(
      '1 week free',
    );
  });

  it('describes a 1-month free trial', () => {
    expect(describeIntroOffer({ price: 0, periodUnit: 'MONTH', periodNumberOfUnits: 1 })).toBe(
      '1 month free',
    );
  });
});
