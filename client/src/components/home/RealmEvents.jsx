/**
 * Realm Events — standing proclamations / world notices shown on the home page.
 * Presentational: pass `events` to override. The defaults are editorial site
 * notices (not live data); wire a real events feed here later.
 */
const DEFAULT_EVENTS = [
  {
    id: 'ruins',
    icon: '☠',
    tone: 'danger',
    title: 'The Sunken Crown stirs',
    body: 'Deadly ruins reported in the south. Travel at your own peril.',
  },
  {
    id: 'gates',
    icon: '⚜',
    tone: 'gold',
    title: 'Gates of Dawnhold open',
    body: 'The capital welcomes new adventurers. Begin your journey there.',
  },
  {
    id: 'tavern',
    icon: '🍷',
    tone: 'emerald',
    title: 'Maren tends the Gilded Stag',
    body: 'A keeper of tales awaits travellers with a story to trade.',
  },
];

export default function RealmEvents({ events = DEFAULT_EVENTS }) {
  return (
    <section className="home-card home-events">
      <header className="home-card-head">
        <h2 className="home-card-title">✦ Realm Events</h2>
        <span className="home-card-pulse">Live pulse</span>
      </header>

      <ul className="home-event-list">
        {events.length === 0 && (
          <li className="home-empty">All quiet across the realm.</li>
        )}
        {events.map(ev => (
          <li key={ev.id} className={`home-event-row home-event-${ev.tone}`}>
            <span className="home-event-icon">{ev.icon}</span>
            <div className="home-event-text">
              <span className="home-event-title">{ev.title}</span>
              <span className="home-event-body">{ev.body}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
