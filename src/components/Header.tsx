import { Locale } from "./i18n";
import Link from "next/link";
import { words } from "./Journey";
interface Props {
  step: number;
  saveStatus: "saved" | "saving" | "error";
  reviewerOpen: boolean;
  onToggleReviewer: () => void;
  locale: Locale;
  onToggleLocale: () => void;
}
export function Header(p: Props) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Arkon home">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M5 26V16a11 11 0 0 1 22 0v10M12 26V16a4 4 0 0 1 8 0v10" />
        </svg>
        arkon<span>health journal</span>
      </Link>
      <div className="header-tools">
        <span className={`save-state ${p.saveStatus}`} role="status">
          <i />
          {p.saveStatus === "saving"
            ? words(p.locale, "正在保存", "Saving…")
            : p.saveStatus === "error"
              ? words(p.locale, "保存未完成", "Not saved")
              : words(p.locale, "进度已保存", "Progress saved")}
        </span>
        <button
          type="button"
          onClick={p.onToggleLocale}
          aria-label={words(p.locale, "Switch to English", "切换中文")}
        >
          {p.locale === "zh" ? "EN" : "中文"}
        </button>
        <button
          type="button"
          className="tool-toggle"
          aria-expanded={p.reviewerOpen}
          onClick={p.onToggleReviewer}
        >
          {words(p.locale, "演示工具", "Demo tools")}
        </button>
      </div>
      <div
        className="header-progress"
        style={{ width: `${Math.min(p.step - 1, 4) * 25}%` }}
      />
    </header>
  );
}
