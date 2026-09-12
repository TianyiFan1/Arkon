import { FullQuizData, fullQuizDataSchema } from '../validations/quiz';
import { AppError } from '../errors';

export interface MacroSplit {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
}

export interface WeightCurvePoint {
  week: number;
  date: string;
  projectedWeightKg: number;
}

export interface HealthAssessmentResult {
  bmi: number;
  bmiCategory: 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
  bmr: number;
  tdee: number;
  recommendedDailyCalories: number;
  calorieDeficit: number;
  projectedDays: number;
  projectedTargetDate: Date;
  projectionCurve: WeightCurvePoint[];
  macroSplit: MacroSplit;
}

/**
 * 核心健康评估算法
 * 演示用估算模型；公式假设与适用限制见 README。
 */
export function calculateHealthAssessment(
  data: FullQuizData,
  currentDate: Date = new Date()
): HealthAssessmentResult {
  const parsed = fullQuizDataSchema.safeParse(data);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid assessment inputs', 400, parsed.error.format());
  if (!Number.isFinite(currentDate.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid calculation date');
  const { gender, age, primaryGoal, heightCm, currentWeightKg, targetWeightKg, activityLevel } = parsed.data;

  // 1. 计算 BMI: 体重(kg) / 身高(m)^2
  const heightM = heightCm / 100;
  const rawBmi = currentWeightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  let bmiCategory: 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
  if (rawBmi < 18.5) {
    bmiCategory = 'UNDERWEIGHT';
  } else if (rawBmi < 25.0) {
    bmiCategory = 'NORMAL';
  } else if (rawBmi < 30.0) {
    bmiCategory = 'OVERWEIGHT';
  } else {
    bmiCategory = 'OBESE';
  }

  // 2. 计算 BMR (Mifflin-St Jeor 公式)
  // 男: 10 * weight + 6.25 * height - 5 * age + 5
  // 女: 10 * weight + 6.25 * height - 5 * age - 161
  // 其他: 均值修正
  let baseBmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'MALE') {
    baseBmr += 5;
  } else if (gender === 'FEMALE') {
    baseBmr -= 161;
  } else {
    baseBmr -= 78;
  }
  if (baseBmr <= 0) throw new AppError('UNSUPPORTED_ASSESSMENT', 'These inputs produce a non-positive metabolic estimate.', 422);
  const bmr = Math.round(baseBmr * 10) / 10;

  // 3. 计算 TDEE (结合活动水平)
  const activityMultipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    VERY_ACTIVE: 1.725,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.2;
  const rawTdee = bmr * multiplier;
  const tdee = Math.round(rawTdee * 10) / 10;

  // Explicit demo policy; never invent a deficit when intake exceeds expenditure.
  const intakeFloor = gender === 'MALE' ? 1500 : gender === 'FEMALE' ? 1200 : 1350;
  const recommendedDailyCalories = primaryGoal === 'LOSE_WEIGHT'
    ? Math.max(intakeFloor, Math.round(tdee - 500))
    : Math.round(tdee + (primaryGoal === 'BUILD_MUSCLE' ? 300 : 0));
  const calorieDeficit = Math.round((tdee - recommendedDailyCalories) * 10) / 10;
  if (primaryGoal === 'LOSE_WEIGHT' && calorieDeficit <= 0) {
    throw new AppError('UNSUPPORTED_ASSESSMENT', 'No weight-loss date can be estimated at the configured intake floor. Review your inputs or choose maintenance.', 422);
  }

  // 5. 计算目标达成所需天数与目标日期
  const weightDiffKg = Math.abs(currentWeightKg - targetWeightKg);
  let projectedDays = 0;

  if (weightDiffKg > 0) {
    if (primaryGoal === 'LOSE_WEIGHT') {
      // 1kg 脂肪约等于 7700 kcal
      const totalCaloriesToBurn = weightDiffKg * 7700;
      projectedDays = Math.ceil(totalCaloriesToBurn / calorieDeficit);
    } else if (primaryGoal === 'BUILD_MUSCLE') {
      // 肌肉健康合成速率约为每 20-25 天增加 1kg 精瘦体重
      projectedDays = Math.ceil(weightDiffKg * 21);
    } else {
      projectedDays = 30; // 维持状态以 30 天为一个评估周期
    }
  }

  const projectedTargetDate = new Date(currentDate.getTime() + projectedDays * 24 * 60 * 60 * 1000);

  // 6. 生成每周动态预测曲线（加入人体代谢适应衰减，模拟真实非线性减重曲线）
  const totalWeeks = Math.ceil(projectedDays / 7);
  const projectionCurve: WeightCurvePoint[] = [];

  for (let week = 0; week <= totalWeeks; week++) {
    const elapsedDays = Math.min(week * 7, projectedDays);
    const pointDate = new Date(currentDate.getTime() + elapsedDays * 24 * 60 * 60 * 1000);
    const dateStr = pointDate.toISOString().split('T')[0];

    if (week === 0) {
      projectionCurve.push({ week: 0, date: dateStr, projectedWeightKg: currentWeightKg });
      continue;
    }

    if (primaryGoal === 'LOSE_WEIGHT') {
      // 真实减重规律：前期由于糖原与水分排出稍快，后期趋向平缓稳定
      const progressRatio = Math.min(1, elapsedDays / projectedDays);
      // 使用指数衰减模型
      const decayFactor = 1 - Math.pow(1 - progressRatio, 1.25);
      const estimatedWeight = currentWeightKg - weightDiffKg * decayFactor;
      const currentPointWeight = Math.max(targetWeightKg, Math.round(estimatedWeight * 10) / 10);
      projectionCurve.push({ week, date: dateStr, projectedWeightKg: currentPointWeight });
    } else if (primaryGoal === 'BUILD_MUSCLE') {
      const progressRatio = Math.min(1, elapsedDays / projectedDays);
      const estimatedWeight = currentWeightKg + weightDiffKg * progressRatio;
      const currentPointWeight = Math.min(targetWeightKg, Math.round(estimatedWeight * 10) / 10);
      projectionCurve.push({ week, date: dateStr, projectedWeightKg: currentPointWeight });
    } else {
      projectionCurve.push({ week, date: dateStr, projectedWeightKg: currentWeightKg });
    }
  }

  // Whole-gram allocation within the calorie budget, including extreme inputs.
  const fatGrams = Math.round(recommendedDailyCalories * 0.25 / 9);
  const fatCalories = fatGrams * 9;
  const proteinGrams = Math.max(0, Math.min(Math.round(targetWeightKg * 2),
    Math.floor((recommendedDailyCalories - fatCalories) * 0.6 / 4)));
  const proteinCalories = proteinGrams * 4;
  const carbsGrams = Math.max(0, Math.round((recommendedDailyCalories - proteinCalories - fatCalories) / 4));
  const carbsCalories = carbsGrams * 4;

  const macroSplit: MacroSplit = {
    proteinGrams,
    carbsGrams,
    fatGrams,
    proteinCalories,
    carbsCalories,
    fatCalories,
  };

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    recommendedDailyCalories,
    calorieDeficit,
    projectedDays,
    projectedTargetDate,
    projectionCurve,
    macroSplit,
  };
}
