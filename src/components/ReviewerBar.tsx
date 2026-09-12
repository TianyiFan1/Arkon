import { Locale } from "./i18n";
import { words } from "./Journey";
interface Props {
  sessionId: string;
  onSwitchPaid: () => void;
  onSwitchUnpaid: () => void;
  onCopyCurl: () => void;
  copyFeedback: boolean;
  onReset: () => void;
  locale: Locale;
}
export function ReviewerBar(p: Props) {
  const w = (z: string, e: string) => words(p.locale, z, e);
  return (
    <aside className="reviewer">
      <div>
        <strong>{w("演示与接口验证", "Demo & API checks")}</strong>
        <p>
          Session <code>{p.sessionId || "…"}</code>
        </p>
      </div>
      <div className="reviewer-actions">
        <button type="button" onClick={p.onSwitchUnpaid}>
          {w("免费示例", "Free example")}
        </button>
        <button type="button" onClick={p.onSwitchPaid}>
          {w("会员示例", "Member example")}
        </button>
        <button type="button" onClick={p.onCopyCurl}>
          {p.copyFeedback ? w("已复制", "Copied") : w("复制 cURL", "Copy cURL")}
        </button>
        <button type="button" onClick={p.onReset}>{w("重新开始", "Start over")}</button>
      </div>
    </aside>
  );
}
