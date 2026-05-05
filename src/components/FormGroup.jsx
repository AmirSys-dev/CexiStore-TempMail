/**
 * FormGroup - Reusable form field wrapper with label, input, and error message
 * Usage: <FormGroup label="Email" error={errors.email} required>
 *          <input type="email" />
 *        </FormGroup>
 */
export default function FormGroup({
  label,
  error,
  help,
  required = false,
  children,
  htmlFor,
  className = ''
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="form-label"
        >
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <div
          className="form-error"
          role="alert"
          id={htmlFor ? `${htmlFor}-error` : undefined}
        >
          {error}
        </div>
      )}
      {help && !error && (
        <div
          className="form-help"
          id={htmlFor ? `${htmlFor}-help` : undefined}
        >
          {help}
        </div>
      )}
    </div>
  );
}
