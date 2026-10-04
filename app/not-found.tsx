import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state">
        <p className="empty-title">Page not found</p>
        <p className="muted">The page or order you are looking for does not exist.</p>
        <Link href="/" className="btn btn-primary">
          Back to shop
        </Link>
      </div>
    </div>
  );
}
