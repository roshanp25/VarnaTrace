import { planForPackageType } from '../planForPackageType';

describe('planForPackageType', () => {
  it('maps MONTHLY to our monthly plan', () => {
    expect(planForPackageType('MONTHLY')).toBe('monthly');
  });

  it('maps ANNUAL to our yearly plan', () => {
    expect(planForPackageType('ANNUAL')).toBe('yearly');
  });

  it('maps anything else to null, including Lifetime — this app only sells monthly/yearly', () => {
    expect(planForPackageType('LIFETIME')).toBeNull();
    expect(planForPackageType('WEEKLY')).toBeNull();
    expect(planForPackageType('CUSTOM')).toBeNull();
    expect(planForPackageType('UNKNOWN')).toBeNull();
  });
});
