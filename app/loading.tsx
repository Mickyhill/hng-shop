export default function Loading() {
  return (
    <div className="container section" aria-busy="true">
      <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 24 }} />
      <div className="product-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: "4 / 5" }} />
        ))}
      </div>
    </div>
  );
}
