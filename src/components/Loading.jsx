export default function Loading({ label = 'در حال بارگذاری...' }) {
  return (
    <div className="container loading-box" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
