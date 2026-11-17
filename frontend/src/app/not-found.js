import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <section className="panel">
        <span className="eyebrow">SDN Defense / 404</span>
        <h1>Page not found</h1>
        <p>
          This page is unavailable. Return to the operations overview to access
          your workspaces.
        </p>
        <Link className="button primary" href="/">
          Return to overview
        </Link>
      </section>
    </main>
  );
}
