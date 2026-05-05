/**
 * FormInput - Standardized input component with validation support
 * Usage: <FormInput
 *          type="email"
 *          placeholder="your@email.com"
 *          value={email}
 *          onChange={(e) => setEmail(e.target.value)}
 *          isInvalid={!!errors.email}
 *          aria-describedby="email-error"
 *        />
 */
export default function FormInput({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  onBlur,
  isInvalid = false,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      className={`form-input ${isInvalid ? 'focus-visible-border' : 'focus-visible-ring'} ${className}`}
      aria-invalid={isInvalid}
      {...props}
    />
  );
}
