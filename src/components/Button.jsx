/**
 * Button - Standardized button component with multiple variants
 * Usage: <Button variant="primary">Click me</Button>
 *        <Button variant="secondary" size="sm" disabled>Disabled</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success'
  };

  const sizeMap = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
