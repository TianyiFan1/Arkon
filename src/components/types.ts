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

export interface AssessmentSummary {
  sessionId: string;
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  recommendedDailyCalories: number;
  calorieDeficit: number;
  projectedDays: number;
  projectedTargetDate: string;
  currentWeightKg?: number;
  targetWeightKg?: number;
}

export interface ResultData {
  isSubscribed: boolean;
  subscriptionStatus: string;
  summary: AssessmentSummary;
  protectedData: {
    projectionCurve: WeightCurvePoint[] | null;
    macroSplit: MacroSplit | null;
  };
  paywall?: {
    isLocked: boolean;
    message: string;
    price?: number;
    currency?: string;
  };
}
