import { z } from 'zod';

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type Gender = z.infer<typeof GenderEnum>;

export const PrimaryGoalEnum = z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'BUILD_MUSCLE']);
export type PrimaryGoal = z.infer<typeof PrimaryGoalEnum>;

export const ActivityLevelEnum = z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE']);
export type ActivityLevel = z.infer<typeof ActivityLevelEnum>;

// 单字段边界规则
export const baseQuizFields = {
  gender: GenderEnum,
  age: z
    .number()
    .int('Age must be an integer')
    .min(14, 'Age must be at least 14 years old')
    .max(120, 'Age must be at most 120 years old'),
  primaryGoal: PrimaryGoalEnum,
  heightCm: z
    .number()
    .min(50.0, 'Height must be at least 50 cm')
    .max(260.0, 'Height must be at most 260 cm'),
  currentWeightKg: z
    .number()
    .min(20.0, 'Current weight must be at least 20 kg')
    .max(350.0, 'Current weight must be at most 350 kg'),
  targetWeightKg: z
    .number()
    .min(20.0, 'Target weight must be at least 20 kg')
    .max(350.0, 'Target weight must be at most 350 kg'),
  activityLevel: ActivityLevelEnum,
};

// 1. 分步更新 Schema：允许部分字段提交，但提交的字段必须符合严格边界
export const stepUpdateSchema = z.object({
  gender: baseQuizFields.gender.optional(),
  age: baseQuizFields.age.optional(),
  primaryGoal: baseQuizFields.primaryGoal.optional(),
  heightCm: baseQuizFields.heightCm.optional(),
  currentWeightKg: baseQuizFields.currentWeightKg.optional(),
  targetWeightKg: baseQuizFields.targetWeightKg.optional(),
  activityLevel: baseQuizFields.activityLevel.optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for step update',
});

export type StepUpdateInput = z.infer<typeof stepUpdateSchema>;

// 2. 算分全量校验 Schema：必须所有字段齐全，且通过生理合理性交叉校验
export const fullQuizDataSchema = z
  .object(baseQuizFields)
  .superRefine((data, ctx) => {
    if (data.primaryGoal === 'MAINTAIN' && data.targetWeightKg !== data.currentWeightKg) {
      ctx.addIssue({ code: 'custom', path: ['targetWeightKg'], message: 'For maintenance, target weight must equal current weight.' });
    }
    // 交叉校验 1：减重目标下，目标体重不能大于或等于当前体重
    if (data.primaryGoal === 'LOSE_WEIGHT' && data.targetWeightKg >= data.currentWeightKg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetWeightKg'],
        message: 'Target weight must be less than current weight when goal is weight loss',
      });
    }

    // 交叉校验 2：增肌目标下，目标体重不能小于当前体重
    if (data.primaryGoal === 'BUILD_MUSCLE' && data.targetWeightKg < data.currentWeightKg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetWeightKg'],
        message: 'Target weight should not be less than current weight when goal is building muscle',
      });
    }

    // 交叉校验 3：目标健康底线校验（目标 BMI < 16.0 属于危险消瘦）
    const heightInMeters = data.heightCm / 100;
    const targetBmi = data.targetWeightKg / (heightInMeters * heightInMeters);
    if (targetBmi < 16.0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetWeightKg'],
        message: 'Target weight results in a dangerously low BMI (< 16.0). Please choose a healthier goal.',
      });
    }
  });

export type FullQuizData = z.infer<typeof fullQuizDataSchema>;

// 3. 模拟支付入参 Schema
export const paymentSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format. Must be a valid UUID.'),
  planType: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).default('MONTHLY'),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const expectedVersionSchema = z.number().int().nonnegative();
