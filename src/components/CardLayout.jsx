/**
 * CardLayout - Reusable card component with header, body, and footer slots
 * Usage: <CardLayout
 *          header="Card Title"
 *          footer={<button>Action</button>}
 *        >
 *          Card content here
 *        </CardLayout>
 */
export default function CardLayout({
  header,
  footer,
  children,
  className = '',
  hoverable = true,
  onClick,
}) {
  return (
    <div
      className={`card ${hoverable ? 'hover-lift' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {header && (
        <div className="card-header">
          {typeof header === 'string' ? (
            <h3 className="card-title">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}

      <div className="card-body">
        {children}
      </div>

      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
