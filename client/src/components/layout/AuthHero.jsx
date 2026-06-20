/**
 * Left-side hero art for the split-screen auth pages (login / register).
 * The warrior strikes the glowing rune-crack that runs down the dividing
 * seam between the art and the form. Image lives at client/public/auth-hero.jpg.
 */
export default function AuthHero() {
  return (
    <aside className="auth-hero" aria-hidden="true">
      <div className="auth-hero-img" />
      <div className="auth-hero-veil" />
      <div className="auth-hero-crack" />
      <div className="auth-hero-wordmark">⚜ Realm of Aldermere</div>
    </aside>
  );
}
