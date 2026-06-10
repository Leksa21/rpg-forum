const MAX_AP = 6;

export default function APBar({ ap }) {
  return (
    <div className="cmb-ap-section">
      <div className="cmb-ap-label">Action Points — {ap} / {MAX_AP}</div>
      <div className="cmb-ap-pips">
        {Array.from({ length: MAX_AP }, (_, i) => (
          <div key={i} className={`cmb-ap-pip${i < ap ? ' filled' : ''}`} />
        ))}
      </div>
    </div>
  );
}
