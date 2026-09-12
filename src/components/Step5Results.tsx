import { Locale } from "./i18n";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { ResultData } from "./types";
import { words } from "./Journey";
interface Props {
  resultData: ResultData;
  onSimulatePayment: () => void;
  onReset: () => void;
  locale: Locale;
}
export function Step5Results({
  resultData: r,
  onSimulatePayment,
  onReset,
  locale,
}: Props) {
  const w = (z: string, e: string) => words(locale, z, e);
  const s = r.summary;
  const curve = r.protectedData.projectionCurve;
  const macro = r.protectedData.macroSplit;
  const numberFormat = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US");
  const date = (d: string) =>
    new Date(d).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  const category: Record<string, string> = {
    UNDERWEIGHT: w("偏低", "Underweight"),
    NORMAL: w("正常范围", "Normal range"),
    OVERWEIGHT: w("偏高", "Overweight"),
    OBESE: w("肥胖范围", "Obese range"),
  };
  let points = "";
  let min = 0,
    max = 0;
  if (curve?.length) {
    min = Math.min(...curve.map((p) => p.projectedWeightKg)) - 1;
    max = Math.max(...curve.map((p) => p.projectedWeightKg)) + 1;
    const first = Date.parse(curve[0].date);
    const span = Date.parse(curve[curve.length - 1].date) - first;
    points = curve
      .map(
        (p) =>
          `${40 + (span ? (Date.parse(p.date) - first) / span : 0) * 620},${220 - ((p.projectedWeightKg - min) / (max - min)) * 170}`,
      )
      .join(" ");
  }
  return (
    <section className="results enter">
      <div className="result-heading">
        <div>
          <div className="question-heading">
            <span className="tiny-dot" />
            {r.isSubscribed
              ? w("完整身体手记", "Full journal")
              : w("身体手记 · 初览", "Your journal · Preview")}
          </div>
          <h1 tabIndex={-1}>
            {w("更了解自己，", "A clearer picture.")}
            <br />
            <em>{w("再向前一步。", "A next step that’s yours.")}</em>
          </h1>
        </div>
        <p>
          {w(
            "根据你提供的身体数据与活动水平生成。把它当作起点，留意身体的真实反馈。",
            "Based on your measurements and activity level. Use this as a starting point, and pay attention to how you feel.",
          )}
        </p>
      </div>
      <div className="result-overview">
        <div className="energy">
          <span>{w("每日建议能量", "Suggested daily energy")}</span>
          <div className="energy-number">
            {numberFormat.format(Math.round(s.recommendedDailyCalories))}
            <small>kcal</small>
          </div>
          <p>
            {w(
              "为你当前目标计算的每日摄入估算",
              "An estimated daily intake for your current goal",
            )}
          </p>
          <div className="energy-rule">
            <span>
              {w("静息代谢", "Resting metabolism")}{" "}
              <b>{Math.round(s.bmr)} kcal</b>
            </span>
            <span>
              {w("每日总消耗", "Daily expenditure")}{" "}
              <b>{Math.round(s.tdee)} kcal</b>
            </span>
          </div>
        </div>
        <div className="result-facts">
          <div>
            <span>{w("身体质量指数", "Body mass index")}</span>
            <strong>
              {s.bmi.toFixed(1)}
              <small>BMI</small>
            </strong>
            <p>{category[s.bmiCategory] || s.bmiCategory}</p>
          </div>
          <div>
            <span>{w("预计目标日期", "Estimated target date")}</span>
            <strong className="date-value">
              <small className="date-year">
                {new Date(s.projectedTargetDate).getUTCFullYear()}
              </small>
              {date(s.projectedTargetDate)}
            </strong>
            <p>
              {s.projectedDays === 0
                ? w("以维持当前体重为目标", "Maintaining your current weight")
                : w(
                    `约 ${s.projectedDays} 天 · 基于固定能量差估算`,
                    `About ${s.projectedDays} days · assumes a constant energy balance`,
                  )}
            </p>
          </div>
        </div>
      </div>
      <div className="details-layout">
        <div className="projection">
          <div className="section-heading">
            <h2>{w("体重的可能轨迹", "A possible weight journey")}</h2>
            <span>
              {r.isSubscribed
                ? w("个人预测", "Personal projection")
                : w("会员内容", "Member content")}
            </span>
          </div>
          {r.isSubscribed && curve?.length ? (
            <>
              <svg
                className="weight-chart"
                viewBox="0 0 700 260"
                role="img"
                aria-label={w(
                  "体重随日期变化的预测图，具体数值见下方数据表",
                  "Projected weight by date; exact values are in the table below",
                )}
              >
                <title>{w("体重预测", "Weight projection")}</title>
                {[0, 1, 2].map((i) => (
                  <g key={i}>
                    <line
                      x1="40"
                      x2="660"
                      y1={50 + i * 85}
                      y2={50 + i * 85}
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 6"
                    />
                    <text x="4" y={54 + i * 85} fontSize="12" fill="var(--chart-axis)">
                      {(max - (i * (max - min)) / 2).toFixed(0)}
                    </text>
                  </g>
                ))}
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points
                  .split(" ")
                  .filter((_, i, a) => i === 0 || i === a.length - 1)
                  .map((p, i) => (
                    <circle
                      key={i}
                      cx={p.split(",")[0]}
                      cy={p.split(",")[1]}
                      r="6"
                      fill="var(--accent)"
                      stroke="var(--surface)"
                      strokeWidth="3"
                    />
                  ))}
                <text x="40" y="250" fill="var(--chart-axis)" fontSize="13">
                  {date(curve[0].date)}
                </text>
                <text
                  x="660"
                  y="250"
                  fill="var(--chart-axis)"
                  fontSize="13"
                  textAnchor="end"
                >
                  {date(curve[curve.length - 1].date)}
                </text>
              </svg>
              <details className="data-table">
                <summary>
                  {w("查看预测数值", "View projection values")} · kg
                </summary>
                <div>
                  <table>
                    <thead>
                      <tr>
                        <th>{w("日期", "Date")}</th>
                        <th>{w("预计体重", "Projected weight")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {curve.map((p, i) => (
                        <tr key={i}>
                          <td>{p.date.slice(0, 10)}</td>
                          <td>{p.projectedWeightKg.toFixed(1)} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <p className="field-help">
                {w(
                  "这条曲线使用固定能量差模型，不代表实际体重会线性变化。",
                  "This model assumes a constant energy balance. Actual weight changes will vary.",
                )}
              </p>
            </>
          ) : (
            <div className="locked">
              <span className="lock-glyph" aria-hidden="true"><LockKeyhole size={54} strokeWidth={1.5} /></span>
              <h3>
                {w(
                  "让下一步，更具体一点。",
                  "Give your next step more detail.",
                )}
              </h3>
              <p>
                {w(
                  "解锁按日期展开的体重预测，以及每日蛋白质、碳水和脂肪分配。",
                  "Unlock a dated weight projection and a daily breakdown of protein, carbohydrates and fats.",
                )}
              </p>
              <span className="quiet">
                {w(
                  "免费预览不包含个人曲线数据",
                  "Personal curve data is not included in this preview",
                )}
              </span>
            </div>
          )}
        </div>
        <aside className={r.isSubscribed ? "nutrition" : "membership"}>
          {r.isSubscribed && macro ? (
            <>
              <div className="question-heading">
                {w("每日营养分配", "Daily macro split")}
              </div>
              <h2>
                {w("每一份能量，", "Make room for")}
                <br />
                {w("各有其位。", "a little of each.")}
              </h2>
              <div className="macro-bar" aria-hidden="true">
                {[
                  macro.proteinCalories,
                  macro.carbsCalories,
                  macro.fatCalories,
                ].map((n, i) => (
                  <span key={i} style={{ flex: n }} />
                ))}
              </div>
              {[
                w("蛋白质", "Protein"),
                w("碳水化合物", "Carbohydrates"),
                w("脂肪", "Fat"),
              ].map((label, i) => (
                <div className="macro-row" key={label}>
                  <span>
                    <i className={`macro-dot tone-${i}`} />
                    {label}
                  </span>
                  <strong>
                    {[macro.proteinGrams, macro.carbsGrams, macro.fatGrams][i]}
                    <small> g</small>
                  </strong>
                </div>
              ))}
              <p className="field-help">
                {w(
                  "根据建议每日能量计算，数值经过四舍五入。",
                  "Calculated from your suggested daily energy; values are rounded.",
                )}
              </p>
            </>
          ) : (
            <>
              <div className="question-heading">
                {w("解锁完整手记", "The complete journal")}
              </div>
              <h2>
                {w("看见完整的", "See the whole")}
                <br />
                {w("下一步。", "next step.")}
              </h2>
              <p>
                {w(
                  "体重预测曲线 + 每日营养分配",
                  "Weight projection + daily macro split",
                )}
              </p>
              <div className="price">
                $29.99
                <small> USD / {w("月", "month")}</small>
              </div>
              <button type="button" className="primary" onClick={onSimulatePayment}>
                {w("模拟支付并解锁", "Simulate Payment & unlock")} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
              </button>
              <p className="payment-note">
                {w(
                  "演示支付，不会产生真实扣款。",
                  "Demo payment. No real charge is made.",
                )}
              </p>
            </>
          )}
        </aside>
      </div>
      <div className="result-bottom">
        <p>
          {w(
            "数值基于通用公式，仅供了解身体与规划日常参考，不能替代个体化医疗建议。",
            "These general formula-based estimates are for everyday planning and do not replace individual medical advice.",
          )}
        </p>
        <button type="button" className="back" onClick={onReset}>
          {w("重新测评", "Start a new assessment")} <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </div>
    </section>
  );
}
