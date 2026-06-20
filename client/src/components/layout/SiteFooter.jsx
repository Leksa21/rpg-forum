import { useLocation } from 'react-router-dom';

const YEAR = new Date().getFullYear();
const HIDDEN_ON = ['/login', '/register'];

export default function SiteFooter() {
  const { pathname } = useLocation();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-mark">⚜ Realm of Aldermere</span>
        <span className="site-footer-copy">© {YEAR} Realm of Aldermere. All rights reserved.</span>
      </div>
    </footer>
  );
}
