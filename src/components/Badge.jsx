/**
 * Badge - Status/tag component with color variants
 * Usage: <Badge variant="success">Active</Badge>
 *        <Badge variant="danger" size="sm">Error</Badge>
 */
export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = ''
}) {
  const variantMap = {
    primary: 'badge-primary',
    success: 'badge-success',
    danger: 'badge-danger',
    warning: 'badge-warning',
    muted: 'badge-muted'
  };

  const sizeMap = {
    sm: 'p-1 px-2 text-xs',
    md: 'p-1 px-2 text-xs',
    lg: 'px-3 py-2 text-sm'
  };

  return (
    <span
      className={`badge ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </span>
  );
}
