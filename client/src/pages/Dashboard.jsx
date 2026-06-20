import { Link } from 'react-router-dom';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import GlobalChat from '../components/GlobalChat';
import ActiveAdventurers from '../components/ActiveAdventurers';
import RealmBanner from '../components/home/RealmBanner';
import OffTopicTeaser from '../components/home/OffTopicTeaser';
import RealmEvents from '../components/home/RealmEvents';
import BountyBoard from '../components/home/BountyBoard';

const ACTIONS = [
  {
    to: '/map',
    icon: '🗺',
    label: 'World Map',
    sub: 'Travel the three continents',
    cls: 'home-action--map',
  },
  {
    to: '/forum',
    icon: '☕',
    label: 'Off-Topic',
    sub: 'Tavern chatter & notices',
    cls: 'home-action--forum',
  },
];

export default function Dashboard() {
  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main home-main">
          <RealmBanner />

          <div className="home-layout">
            <div className="home-col-main">
              <div className="home-actions">
                {ACTIONS.map(({ to, icon, label, sub, cls }) => (
                  <Link key={to} to={to} className={`home-action ${cls}`}>
                    <span className="home-action-icon">{icon}</span>
                    <span className="home-action-text">
                      <span className="home-action-label">{label}</span>
                      <span className="home-action-sub">{sub}</span>
                    </span>
                    <span className="home-action-arrow">→</span>
                  </Link>
                ))}
              </div>

              <OffTopicTeaser />
            </div>

            <aside className="home-col-side">
              <RealmEvents />
              <BountyBoard />
            </aside>
          </div>

          <div className="home-section">
            <span className="home-section-label">✦ Community</span>
            <span className="home-section-rule" />
          </div>
          <div className="home-community">
            <ActiveAdventurers />
            <GlobalChat />
          </div>
        </main>
      </div>
    </>
  );
}
