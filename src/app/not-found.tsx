import Link from "next/link";
export default function NotFound() {
  return (
    <main className="main-content">
      <section className="calculation">
        <div className="orbit stopped" aria-hidden="true">
          <span>↗</span>
        </div>
        <div className="question-heading">arkon · 404</div>
        <h1>这页手记还不存在。</h1>
        <p>
          找不到这个页面。回到测评，继续了解自己。
          <br />
          This page could not be found. Return to your journal.
        </p>
        <Link href="/" className="primary">
          返回测评 · Back to journal ↗
        </Link>
      </section>
    </main>
  );
}
