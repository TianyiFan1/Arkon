export type Locale = "en" | "zh";
export const i18n = {
  en: {
    step1: {
      errorSelect: "Please select both your primary goal and gender",
    },
    step2: {
      errorAge: "Age must be between 14 and 120",
    },
    step3: {
      errorIncomplete: "Please complete height, weight and target weight",
      errorTargetWeight:
        "Target weight must be less than current weight for weight loss goal",
      errorTargetWeightMuscle:
        "Target weight should not be less than current weight when goal is building muscle",
      errorTargetWeightLowBmi:
        "Target weight results in a dangerously low BMI (< 16.0). Please choose a healthier goal.",
    },
    step4: {
      errorSelect: "Please select your regular activity level",
    },
    results: {
      paySuccessToast: "Payment Simulated! Member Plan Unlocked",
    },
  },
  zh: {
    step1: {
      errorSelect: "请同时选择您的健身目标与生理性别",
    },
    step2: {
      errorAge: "年龄必须在 14 至 120 岁之间",
    },
    step3: {
      errorIncomplete: "请完整填写身高、当前体重与目标体重",
      errorTargetWeight: "减重目标下，目标体重必须小于当前体重",
      errorTargetWeightMuscle: "增肌目标下，目标体重不能小于当前体重",
      errorTargetWeightLowBmi:
        "目标体重会导致 BMI 过低 (< 16.0)，请设定更健康的目标",
    },
    step4: {
      errorSelect: "请选择您的日常活动水平",
    },
    results: {
      paySuccessToast: "模拟支付成功！会员完整数据已解锁",
    },
  },
};
