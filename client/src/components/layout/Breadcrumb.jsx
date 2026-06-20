import { Link } from 'react-router-dom';

// items: [{ label, to? }]. The last item is the current page and never links.
// Any item without `to` renders as plain text (e.g. a region with no own page).
export default function Breadcrumb({ items }) {
  const trail = items.filter(Boolean);
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={i} className="breadcrumb-item">
            {item.to && !isLast ? (
              <Link to={item.to} className="breadcrumb-link">{item.label}</Link>
            ) : (
              <span className={isLast ? 'breadcrumb-current' : 'breadcrumb-text'}>{item.label}</span>
            )}
            {!isLast && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
