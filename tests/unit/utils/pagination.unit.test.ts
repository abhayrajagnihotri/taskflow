import { getPaginationParams } from '../../../src/utils/pagination';

describe('Unit Tests: Pagination Helper (getPaginationParams)', () => {
  it('should return default values when no parameters are passed', () => {
    const result = getPaginationParams();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('should correctly calculate skip for custom page and limit', () => {
    const result = getPaginationParams(3, 15);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
    expect(result.skip).toBe(30); // (3 - 1) * 15 = 30
  });

  it('should parse numeric strings correctly', () => {
    const result = getPaginationParams('2', '10');
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(10); // (2 - 1) * 10 = 10
  });

  it('should fallback to default page 1 when negative or invalid page is provided', () => {
    const res1 = getPaginationParams(-5, 10);
    expect(res1.page).toBe(1);
    expect(res1.skip).toBe(0);

    const res2 = getPaginationParams('invalid', 10);
    expect(res2.page).toBe(1);
    expect(res2.skip).toBe(0);
  });

  it('should fallback to default limit 20 when invalid limit is provided', () => {
    const res = getPaginationParams(1, 'abc');
    expect(res.limit).toBe(20);
  });

  it('should cap maximum limit to 100 when limit exceeds 100', () => {
    const result = getPaginationParams(1, 500);
    expect(result.limit).toBe(100);
  });
});
