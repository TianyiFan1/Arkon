import { Locale } from "./i18n";
import { Journey, Actions, Choice, words, radioKeys } from "./Journey";
interface Props {
  activityLevel: string;
  onSetActivityLevel: (
    v: "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE",
  ) => void;
  onBack: () => void;
  onCalculate: () => void;
  locale: Locale;
}
export function Step4Activity(p: Props) {
  const w = (z: string, e: string) => words(p.locale, z, e);
  return (
    <Journey
      step={4}
      locale={p.locale}
      title={w("把日常活动，也算进去。", "Your everyday movement matters.")}
      description={w(
        "坐着工作、散步或运动，都影响一天的能量消耗。选择最接近你平常一周的状态。",
        "Desk time, walks and workouts all shape your daily energy needs. Think of a typical week.",
      )}
    >
      <div className="question-heading">
        <span className="tiny-dot" />
        {w("日常节奏", "Everyday rhythm")}
      </div>
      <h2>{w("你平时活动多吗？", "How active is your everyday?")}</h2>
      <div
        id="activity-group"
        tabIndex={-1}
        className="choices"
        role="radiogroup"
        onKeyDown={radioKeys}
        aria-label={w("活动水平", "Activity level")}
      >
        {(["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"] as const).map(
          (v, i) => (
            <Choice
              key={v}
              selected={p.activityLevel === v}
              onClick={() => p.onSetActivityLevel(v)}
              mark={
                <span className="activity-bars">
                  {[0, 1, 2, 3].map((b) => (
                    <i
                      key={b}
                      style={{ height: 8 + b * 5, opacity: b <= i ? 1 : 0.18 }}
                    />
                  ))}
                </span>
              }
              title={
                [
                  w("大多坐着", "Mostly sedentary"),
                  w("偶尔动一动", "Lightly active"),
                  w("规律运动", "Moderately Active"),
                  w("经常高强度活动", "Very active"),
                ][i]
              }
              detail={
                [
                  w(
                    "久坐为主，很少额外运动",
                    "Mostly seated, little additional exercise",
                  ),
                  w(
                    "每周约 1–3 天轻度运动",
                    "Light exercise around 1–3 days a week",
                  ),
                  w(
                    "每周约 3–5 天中等强度运动",
                    "Moderate exercise around 3–5 days a week",
                  ),
                  w(
                    "每周约 6–7 天运动或体力工作",
                    "Exercise most days or a physical job",
                  ),
                ][i]
              }
            />
          ),
        )}
      </div>
      <Actions
        locale={p.locale}
        onBack={p.onBack}
        onNext={p.onCalculate}
        label={w("查看我的结果", "See my results")}
      />
    </Journey>
  );
}
