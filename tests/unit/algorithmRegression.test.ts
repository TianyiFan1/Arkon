import { describe, it, expect } from 'vitest';
import { calculateHealthAssessment } from '../../src/lib/algorithm/healthAssessment';
import { fullQuizDataSchema, FullQuizData } from '../../src/lib/validations/quiz';

const base: FullQuizData = { gender: 'FEMALE', age: 55, primaryGoal: 'LOSE_WEIGHT', heightCm: 150, currentWeightKg: 55, targetWeightKg: 50, activityLevel: 'SEDENTARY' };
const date = new Date('2026-09-10T12:00:00Z');
describe('Algorithm regression properties', () => {
  it('uses the actual deficit, even when it is below 200', () => {
    const result = calculateHealthAssessment(base, date);
    expect(result.calorieDeficit).toBeCloseTo(result.tdee - result.recommendedDailyCalories, 1);
    expect(result.calorieDeficit).toBeLessThan(200);
    expect(result.projectedDays).toBe(Math.ceil(5 * 7700 / result.calorieDeficit));
  });
  it('rejects nonexistent deficits instead of fabricating dates', () => {
    expect(() => calculateHealthAssessment({ ...base, currentWeightKg: 45, targetWeightKg: 42 })).toThrow('No weight-loss date');
  });
  it('rejects non-positive metabolism even when single fields are within bounds', () => {
    expect(() => calculateHealthAssessment({ ...base, primaryGoal: 'MAINTAIN', age: 120, heightCm: 50, currentWeightKg: 20, targetWeightKg: 20 })).toThrow('non-positive');
  });
  it('classifies the raw BMI rather than its rounded display value', () => {
    const result = calculateHealthAssessment({ ...base, gender: 'MALE', age: 30, heightCm: 200, currentWeightKg: 99.9, targetWeightKg: 90 });
    expect(result.bmi).toBe(25);
    expect(result.bmiCategory).toBe('NORMAL');
  });
  it('aligns the last curve date with the target date', () => {
    const result = calculateHealthAssessment(base, date);
    expect(result.projectionCurve.at(-1)?.date).toBe(result.projectedTargetDate.toISOString().slice(0, 10));
  });
  it('requires a maintenance target to equal current weight', () => {
    expect(fullQuizDataSchema.safeParse({ ...base, primaryGoal: 'MAINTAIN' }).success).toBe(false);
  });
  it.each([20, 60, 150, 350])('keeps macro energy within rounding tolerance at %s kg', weight => {
    const result = calculateHealthAssessment({ ...base, primaryGoal: 'BUILD_MUSCLE', heightCm: 100, currentWeightKg: 60, targetWeightKg: Math.max(60, weight), age: 30 });
    const m = result.macroSplit;
    expect(Math.abs(m.proteinGrams * 4 + m.carbsGrams * 4 + m.fatGrams * 9 - result.recommendedDailyCalories)).toBeLessThanOrEqual(2);
  });
});
