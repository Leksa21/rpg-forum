const YEAR = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-mark">⚜ Realm of Aldermere</span>
        <span className="site-footer-copy">© {YEAR} Realm of Aldermere. All rights reserved.</span>
      </div>
    </footer>
  );
}
