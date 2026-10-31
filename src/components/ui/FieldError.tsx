/** The red message under a field. Its id is what the field's aria-describedby points to. */
export function FieldError({
  id,
  message,
  className,
}: {
  id: string;
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} className={`text-sm font-semibold text-danger ${className ?? ""}`}>
      {message}
    </p>
  );
}
