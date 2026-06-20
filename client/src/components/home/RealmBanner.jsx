import { Link } from 'react-router-dom';

/**
 * Hero banner for the home page.
 * The artwork slot reads from the `--home-banner-img` CSS custom property
 * (see home.css). Drop a file at client/public/banner.jpg and the slot picks
 * it up automatically; until then a layered emerald/gold gradient stands in.
 */
export default function RealmBanner() {
  return (
    <section className="home-banner" aria-labelledby="home-banner-title">
      <div className="home-banner-art" aria-hidden="true" />
      <div className="home-banner-veil" aria-hidden="true" />
      <div className="home-banner-inner">
        <span className="home-banner-eyebrow">⚜ The Chronicle of</span>
        <h1 id="home-banner-title" className="home-banner-title">Realm of Aldermere</h1>
        <p className="home-banner-tagline">
          Three continents, a thousand tales. Step through the gate and write your own.
        </p>
        <div className="home-banner-stats">
          <span className="home-stat-chip"><strong>3</strong> Continents</span>
          <span className="home-stat-chip"><strong>12</strong> Locations</span>
          <span className="home-stat-chip home-stat-live"><span className="home-stat-pip" /> Realm is live</span>
        </div>
        <div className="home-banner-cta">
          <Link to="/map" className="btn-cta home-banner-enter">⚔ Enter the Realm</Link>
          <Link to="/world/areas" className="home-banner-ghost">Browse the Areas →</Link>
        </div>
      </div>
    </section>
  );
}
