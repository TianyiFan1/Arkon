import { Locale } from "./i18n";
import { Journey, Actions, words } from "./Journey";
interface Props {
  heightCm: number | "";
  currentWeightKg: number | "";
  targetWeightKg: number | "";
  primaryGoal?: string;
  unitSystem: "metric" | "imperial";
  onSetHeightCm: (v: number) => void;
  onSetCurrentWeightKg: (v: number) => void;
  onSetTargetWeightKg: (v: number) => void;
  onSetUnitSystem: (v: "metric" | "imperial") => void;
  onBack: () => void;
  onNext: () => void;
  locale: Locale;
}
export function Step3Measurements(p: Props) {
  const w = (z: string, e: string) => words(p.locale, z, e);
  const imperial = p.unitSystem === "imperial";
  const fields = [
    {
      id: "height",
      label: w("身高", "Height"),
      value: p.heightCm,
      set: p.onSetHeightCm,
      factor: imperial ? 1 / 2.54 : 1,
      unit: imperial ? "in" : "cm",
    },
    {
      id: "weight",
      label: w("当前体重", "Current weight"),
      value: p.currentWeightKg,
      set: p.onSetCurrentWeightKg,
      factor: imperial ? 2.2046226218 : 1,
      unit: imperial ? "lb" : "kg",
    },
    {
      id: "target",
      label: w("目标体重", "Target weight"),
      value: p.targetWeightKg,
      set: p.onSetTargetWeightKg,
      factor: imperial ? 2.2046226218 : 1,
      unit: imperial ? "lb" : "kg",
    },
  ];
  return (
    <Journey
      step={3}
      locale={p.locale}
      title={w(
        "记录此刻，也留一点期待。",
        "Where you are. Where you’d like to be.",
      )}
      description={w(
        "用身高和体重描绘你的起点。目标不必很远，适合自己更重要。",
        "Your measurements mark a starting point. Choose a target that feels right for you.",
      )}
    >
      <div className="question-heading">
        <span className="tiny-dot" />
        {w("身体刻度", "Your measurements")}
      </div>
      <div className="heading-row">
        <h2>{w("你的身体数据", "Your Measurements")}</h2>
        <div
          className="unit-toggle"
          role="group"
          aria-label={w("单位", "Units")}
        >
          <button
            type="button"
            aria-pressed={!imperial}
            onClick={() => p.onSetUnitSystem("metric")}
          >
            cm / kg
          </button>
          <button
            type="button"
            aria-pressed={imperial}
            onClick={() => p.onSetUnitSystem("imperial")}
          >
            in / lb
          </button>
        </div>
      </div>
      <div className="measurements">
        {fields.map((f) => (
          <label key={f.id} className="measurement" htmlFor={f.id}>
            <span>{f.label}</span>
            <div>
              <input
                id={f.id}
                name={f.id}
                type="number"
                inputMode="decimal"
                autoComplete="off"
                step="0.1"
                value={
                  f.value === ""
                    ? ""
                    : Math.round(Number(f.value) * f.factor * 10) / 10
                }
                onChange={(e) => f.set(Number(e.target.value) / f.factor)}
              />
              <span className="unit">{f.unit}</span>
            </div>
          </label>
        ))}
      </div>
      <p className="field-help">
        {p.primaryGoal === "MAINTAIN"
          ? w(
              "保持体重时，目标默认是当前体重。修改后，请将当前体重同步为相同数值。",
              "For maintenance, the target starts at your current weight. If you change it, update your current weight to match.",
            )
          : w(
              "请填写最近的测量值。之后仍可以返回调整。",
              "Use your latest measurements. You can come back and adjust them.",
            )}
      </p>
      <Actions locale={p.locale} onBack={p.onBack} onNext={p.onNext} />
    </Journey>
  );
}
