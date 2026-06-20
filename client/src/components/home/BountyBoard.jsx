/**
 * Bounty Board — placeholder. The bounty mechanics are designed later;
 * this renders an inviting "coming soon" surface in the right spot on the
 * home page so the layout is final and the feature can drop straight in.
 */
export default function BountyBoard() {
  return (
    <section className="home-card home-bounty">
      <header className="home-card-head">
        <h2 className="home-card-title">🗡 Bounty Board</h2>
        <span className="home-card-soon">Soon</span>
      </header>

      <div className="home-bounty-body">
        <div className="home-bounty-seal">⚜</div>
        <p className="home-bounty-lead">No bounties posted… yet.</p>
        <p className="home-bounty-sub">
          Contracts, rewards, and wanted notices will be nailed to this board.
          Sharpen your blade.
        </p>
      </div>
    </section>
  );
}
