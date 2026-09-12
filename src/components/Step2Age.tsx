import { Locale } from "./i18n";
import { Journey, Actions, words } from "./Journey";
interface Props {
  age: number | "";
  onSetAge: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
  locale: Locale;
}
export function Step2Age(p: Props) {
  const w = (z: string, e: string) => words(p.locale, z, e);
  return (
    <Journey
      step={2}
      locale={p.locale}
      title={w("每个年龄，都有自己的节奏。", "Every age has its own rhythm.")}
      description={w(
        "年龄会影响静息时的能量消耗。我们用它来调整你的代谢估算。",
        "Age influences the energy your body uses at rest. It helps us put your estimate in context.",
      )}
    >
      <div className="question-heading">
        <span className="tiny-dot" />
        {w("关于你", "A little about you")}
      </div>
      <h2>{w("你今年多少岁？", "How old are you?")}</h2>
      <div className="age-value">
        <input
          id="age"
          name="age"
          aria-label={w("年龄", "Age")}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          min="14"
          max="120"
          value={p.age}
          onChange={(e) => p.onSetAge(Number(e.target.value))}
        />
        <span>{w("岁", "years")}</span>
      </div>
      <label className="sr-only" htmlFor="age-range">
        {w("你今年多少岁？", "How old are you?")}
      </label>
      <input
        id="age-range"
        name="age-range"
        className="age-range"
        type="range"
        min="14"
        max="120"
        value={p.age || 14}
        onChange={(e) => p.onSetAge(Number(e.target.value))}
      />
      <div className="range-labels">
        <span>14</span>
        <span>50</span>
        <span>85</span>
        <span>120</span>
      </div>
      <div className="paper-note">
        <span className="note-symbol">≈</span>
        <p>
          {w(
            "一个数字，不定义你。它只帮助公式更接近你的实际情况。",
            "A number doesn’t define you. It simply makes the estimate more relevant to you.",
          )}
        </p>
      </div>
      <Actions locale={p.locale} onBack={p.onBack} onNext={p.onNext} />
    </Journey>
  );
}
