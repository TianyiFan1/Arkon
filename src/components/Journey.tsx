import { ReactNode, KeyboardEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { Locale } from "./i18n";
export const words = (locale: Locale, zh: string, en: string) =>
  locale === "zh" ? zh : en;
export function Journey({
  step,
  title,
  description,
  locale,
  children,
}: {
  step: number;
  title: string;
  description: string;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <section className="journey assessment-stage enter">
      <div className="stage-meta">
        <span>{words(locale, "身体手记", "Body journal")}</span>
        <span className="stage-count">
          {words(locale, "第 ", "Step ")}{String(step).padStart(2, "0")}
          {words(locale, " 步，共 04 步", " of 04")}
        </span>
      </div>
      <header className="stage-intro">
        <div className="step-bars" aria-label={words(locale, "测评进度", "Assessment progress")}>
          {[1, 2, 3, 4].map((item) => (
            <i key={item} className={item <= step ? "done" : ""} />
          ))}
        </div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="worksheet answer-surface">{children}</div>
    </section>
  );
}
export function Actions({
  locale,
  onNext,
  onBack,
  label,
}: {
  locale: Locale;
  onNext: () => void;
  onBack?: () => void;
  label?: string;
}) {
  return (
    <div className="actions">
      {onBack ? (
        <button type="button" className="back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          {words(locale, "上一步", "Back")}
        </button>
      ) : (
        <span className="quiet">
          {words(locale, "下一步 · 年龄", "Next · Age")}
        </span>
      )}
      <button type="button" className="primary" onClick={onNext}>
        {label || words(locale, "继续", "Continue")}{" "}
        <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}
export function Choice({
  selected,
  onClick,
  title,
  detail,
  mark,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail?: string;
  mark?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`choice ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <span className="choice-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="choice-copy">
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <span className="radio-dot" aria-hidden="true">
        {selected && <Check size={12} strokeWidth={2.25} />}
      </span>
    </button>
  );
}

export function radioKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)
  )
    return;
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  );
  const current = options.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : (current +
            (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) +
            options.length) %
          options.length;
  options[index].focus();
  options[index].click();
}
