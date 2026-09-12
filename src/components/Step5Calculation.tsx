import { useEffect, useRef } from "react";
import { ArrowUpRight, Waves } from "lucide-react";
import { Locale } from "./i18n";
import { words } from "./Journey";
interface Props {
  locale: Locale;
  calculationError?: string | null;
  onComplete: () => void;
  onRetry: () => void;
  onGoToStep3: () => void;
  onAutoFixAndRetry?: () => void;
  canAutoFix?: boolean;
}
export function Step5Calculation(p: Props) {
  const done = useRef(p.onComplete);
  useEffect(() => {
    done.current = p.onComplete;
  }, [p.onComplete]);
  useEffect(() => {
    if (p.calculationError) return;
    const t = setTimeout(() => done.current(), 1000);
    return () => clearTimeout(t);
  }, [p.calculationError]);
  const w = (z: string, e: string) => words(p.locale, z, e);
  return (
    <section className="calculation enter" aria-live="polite">
      <div
        className={`orbit ${p.calculationError ? "stopped" : ""}`}
        aria-hidden="true"
      >
        <Waves size={58} strokeWidth={1.5} />
      </div>
      <div className="question-heading">
        {w("你的身体手记", "Your body journal")}
      </div>
      <h1 tabIndex={-1}>
        {p.calculationError
          ? w("有一项需要再看一下。", "Let’s check one thing.")
          : w(
              "把你的日常，整理成答案。",
              "Putting your everyday into perspective.",
            )}
      </h1>
      <p>
        {p.calculationError ||
          w(
            "正在根据你的输入计算代谢、能量需求和目标时间。",
            "Calculating your metabolism, energy needs and target timeline from your answers.",
          )}
      </p>
      {p.calculationError ? (
        <div className="error-actions">
          <button type="button" className="primary" onClick={p.onRetry}>
            {w("重新计算", "Try again")} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
          <button type="button" className="back" onClick={p.onGoToStep3}>
            {w("调整身体数据", "Edit measurements")}
          </button>
          {p.canAutoFix && p.onAutoFixAndRetry && (
            <button type="button" className="back" onClick={p.onAutoFixAndRetry}>
              {w("调整目标并重试", "Adjust target and retry")}
            </button>
          )}
        </div>
      ) : (
        <span className="quiet">
          {w(
            "结果是公式估算，不是医疗诊断。",
            "These are formula-based estimates, not a medical diagnosis.",
          )}
        </span>
      )}
    </section>
  );
}
