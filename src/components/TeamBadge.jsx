export default function TeamBadge({ code, name }) {
  return (
    <div className="team-badge">
      <span>{code}</span>
      <strong>{name}</strong>
    </div>
  );
}
