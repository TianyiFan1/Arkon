import { describe, it, expect } from 'vitest';
import { calculateHealthAssessment } from '@/lib/algorithm/healthAssessment';
import { fullQuizDataSchema } from '@/lib/validations/quiz';

describe('Unit Test: Health Assessment Algorithm (核心健康评估算法)', () => {
  const fixedDate = new Date('2026-09-10T12:00:00Z');

  describe('1. 标准男女算例与精度验证 (Standard Calculations)', () => {
    it('应正确计算标准男性指标 (BMI, BMR, TDEE, Calories, Deficit)', () => {
      const input = {
        gender: 'MALE' as const,
        age: 30,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 180,
        currentWeightKg: 85,
        targetWeightKg: 75,
        activityLevel: 'LIGHT' as const,
      };

      const result = calculateHealthAssessment(input, fixedDate);

      // BMI = 85 / (1.80^2) = 26.23... -> 26.2 (OVERWEIGHT)
      expect(result.bmi).toBe(26.2);
      expect(result.bmiCategory).toBe('OVERWEIGHT');

      // BMR = 10*85 + 6.25*180 - 5*30 + 5 = 850 + 1125 - 150 + 5 = 1830
      expect(result.bmr).toBe(1830);

      // TDEE = 1830 * 1.375 = 2516.25 -> 2516.3
      expect(result.tdee).toBe(2516.3);

      // Recommended Calories = 2516.25 - 500 = 2016
      expect(result.recommendedDailyCalories).toBe(2016);
      expect(result.calorieDeficit).toBeCloseTo(result.tdee - result.recommendedDailyCalories, 1);

      // 减重 10kg = 77,000 kcal / 500 = 154 天
      expect(result.projectedDays).toBe(154);

      // 验证目标达成日期
      const expectedTargetDate = new Date(fixedDate.getTime() + 154 * 24 * 60 * 60 * 1000);
      expect(result.projectedTargetDate.toISOString()).toBe(expectedTargetDate.toISOString());

      // 预测曲线起点与终点验证
      expect(result.projectionCurve[0].projectedWeightKg).toBe(85);
      const lastPoint = result.projectionCurve[result.projectionCurve.length - 1];
      expect(lastPoint.projectedWeightKg).toBe(75);
    });

    it('应正确计算标准女性指标与热量亏空', () => {
      const input = {
        gender: 'FEMALE' as const,
        age: 28,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 165,
        currentWeightKg: 65,
        targetWeightKg: 58,
        activityLevel: 'MODERATE' as const,
      };

      const result = calculateHealthAssessment(input, fixedDate);

      // BMI = 65 / (1.65^2) = 23.87... -> 23.9 (NORMAL)
      expect(result.bmi).toBe(23.9);
      expect(result.bmiCategory).toBe('NORMAL');

      // BMR = 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380.3
      expect(result.bmr).toBe(1380.3);

      // TDEE = 1380.3 * 1.55 = 2139.465 -> 2139.5
      expect(result.tdee).toBe(2139.5);

      // 减重 7kg = 53,900 kcal / 500 = 108 天
      expect(result.projectedDays).toBe(108);
      expect(result.recommendedDailyCalories).toBe(1640);
    });
  });

  describe('2. 极端身材与边界安全验证 (Extreme & Boundary Cases)', () => {
    it('极矮极瘦极限边界 (50cm, 20kg, 14岁, 维持目标)', () => {
      const input = {
        gender: 'FEMALE' as const,
        age: 14,
        primaryGoal: 'MAINTAIN' as const,
        heightCm: 50,
        currentWeightKg: 20,
        targetWeightKg: 20,
        activityLevel: 'SEDENTARY' as const,
      };

      const result = calculateHealthAssessment(input, fixedDate);
      expect(result.bmi).toBeGreaterThan(0);
      // 当前体重等于目标体重，达成所需天数为0
      expect(result.projectedDays).toBe(0);
      expect(result.recommendedDailyCalories).toBeGreaterThan(0);
    });

    it('极高极大体重极限边界 (260cm, 350kg, 120岁)', () => {
      const input = {
        gender: 'MALE' as const,
        age: 120,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 260,
        currentWeightKg: 350,
        targetWeightKg: 200,
        activityLevel: 'VERY_ACTIVE' as const,
      };

      const result = calculateHealthAssessment(input, fixedDate);
      expect(result.bmi).toBeGreaterThan(50);
      expect(result.bmiCategory).toBe('OBESE');
      expect(result.projectionCurve.length).toBeGreaterThan(1);
    });

    it('饥饿休克保护：当热量赤字使摄入量低于女性安全下限时，触发底线保护 (1200 kcal)', () => {
      const lowCalorieUser = {
        gender: 'FEMALE' as const,
        age: 55,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 150,
        currentWeightKg: 45,
        targetWeightKg: 42,
        activityLevel: 'SEDENTARY' as const,
      };

      expect(() => calculateHealthAssessment(lowCalorieUser, fixedDate)).toThrow('No weight-loss date');
    });
  });

  describe('3. 生理逻辑冲突与非法输入拦截 (Contradictions & Illegal Inputs)', () => {
    it('当目标为减重(LOSE_WEIGHT)但目标体重高于当前体重时，Schema应显式拒绝', () => {
      const invalidWeightLoss = {
        gender: 'MALE' as const,
        age: 25,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 175,
        currentWeightKg: 70,
        targetWeightKg: 85,
        activityLevel: 'MODERATE' as const,
      };

      const parseResult = fullQuizDataSchema.safeParse(invalidWeightLoss);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.issues[0].message).toContain('Target weight must be less than current weight');
      }
    });

    it('当目标为增肌(BUILD_MUSCLE)但目标体重低于当前体重时，Schema应显式拒绝', () => {
      const invalidMuscleGain = {
        gender: 'MALE' as const,
        age: 25,
        primaryGoal: 'BUILD_MUSCLE' as const,
        heightCm: 175,
        currentWeightKg: 80,
        targetWeightKg: 65,
        activityLevel: 'MODERATE' as const,
      };

      const parseResult = fullQuizDataSchema.safeParse(invalidMuscleGain);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.issues[0].message).toContain('Target weight should not be less than current weight');
      }
    });

    it('当目标体重将导致危险过低 BMI (< 16.0) 时，Schema应拦截厌食风险', () => {
      const dangerousTarget = {
        gender: 'FEMALE' as const,
        age: 20,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 170,
        currentWeightKg: 55,
        targetWeightKg: 40,
        activityLevel: 'LIGHT' as const,
      };

      const parseResult = fullQuizDataSchema.safeParse(dangerousTarget);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.issues[0].message).toContain('dangerously low BMI');
      }
    });
  });

  describe('4. 三大营养素配比守恒 (Macro Nutrients Integrity)', () => {
    it('宏量营养素总卡路里应与推荐每日摄入量基本守恒', () => {
      const input = {
        gender: 'MALE' as const,
        age: 29,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 178,
        currentWeightKg: 82,
        targetWeightKg: 74,
        activityLevel: 'MODERATE' as const,
      };

      const result = calculateHealthAssessment(input, fixedDate);
      const { macroSplit, recommendedDailyCalories } = result;

      const calculatedCalories =
        macroSplit.proteinGrams * 4 + macroSplit.fatGrams * 9 + macroSplit.carbsGrams * 4;

      expect(Math.abs(calculatedCalories - recommendedDailyCalories)).toBeLessThan(35);
    });
  });
});
