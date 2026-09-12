import { Locale } from "./i18n";
import { Journey, Actions, Choice, words, radioKeys } from "./Journey";
import { Equal, TrendingDown, TrendingUp } from "lucide-react";
interface Props {
  gender: string;
  primaryGoal: string;
  onSetGender: (g: "MALE" | "FEMALE" | "OTHER") => void;
  onSetPrimaryGoal: (g: "LOSE_WEIGHT" | "MAINTAIN" | "BUILD_MUSCLE") => void;
  onNext: () => void;
  locale: Locale;
}
export function Step1Profile(p: Props) {
  const w = (z: string, e: string) => words(p.locale, z, e);
  return (
    <Journey
      step={1}
      locale={p.locale}
      title={w(
        "先从你想要的改变开始。",
        "A small start. A change that’s yours.",
      )}
      description={w(
        "不必和别人比较。告诉我们你的目标，让这份身体手记从你开始。",
        "No comparison needed. Tell us what you have in mind, and let’s start from there.",
      )}
    >
      <div className="question-heading">
        <span className="tiny-dot" /> {w("你的方向", "Your direction")}
      </div>
      <h2>{w("现在，你最想做什么？", "What would you like to work on?")}</h2>
      <div
        id="goal-group"
        tabIndex={-1}
        role="radiogroup"
        onKeyDown={radioKeys}
        aria-label={w("身体目标", "Your goal")}
        className="choices"
      >
        {(["LOSE_WEIGHT", "MAINTAIN", "BUILD_MUSCLE"] as const).map((v, i) => (
          <Choice
            key={v}
            selected={p.primaryGoal === v}
            onClick={() => p.onSetPrimaryGoal(v)}
            mark={[
              <TrendingDown key="down" size={23} strokeWidth={1.75} />,
              <Equal key="equal" size={23} strokeWidth={1.75} />,
              <TrendingUp key="up" size={23} strokeWidth={1.75} />,
            ][i]}
            title={
              [
                w("轻一点", "Lose weight"),
                w("保持好状态", "Maintain weight"),
                w("增加肌肉", "Build muscle"),
              ][i]
            }
            detail={
              [
                w(
                  "设定一个循序渐进的体重目标",
                  "Work toward a lower target weight",
                ),
                w(
                  "了解维持当前体重的能量需求",
                  "Understand your maintenance needs",
                ),
                w(
                  "为增重目标估算每日能量",
                  "Estimate energy for a weight-gain goal",
                ),
              ][i]
            }
          />
        ))}
      </div>
      <div className="question-divider">
        <h3>{w("用于计算的生理性别", "Sex used for the calculation")}</h3>
        <p>
          {w(
            "这是代谢公式的输入项。选择“其他”时使用平均系数。",
            "An input to the metabolic formula. “Other” uses an averaged coefficient.",
          )}
        </p>
      </div>
      <div
        id="sex-group"
        tabIndex={-1}
        className="segmented"
        role="radiogroup"
        onKeyDown={radioKeys}
        aria-label={w("生理性别", "Sex")}
      >
        {(["MALE", "FEMALE", "OTHER"] as const).map((v, i) => (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={p.gender === v}
            className={p.gender === v ? "active" : ""}
            onClick={() => p.onSetGender(v)}
          >
            {[w("男性", "Male"), w("女性", "Female"), w("其他", "Other")][i]}
          </button>
        ))}
      </div>
      <Actions locale={p.locale} onNext={p.onNext} />
    </Journey>
  );
}
