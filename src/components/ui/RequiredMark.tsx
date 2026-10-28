/**
 * The visual "*" for required fields. Hidden from screen readers (they hear "required" from
 * aria-required) and kept outside the <label> so the label is exactly the field's name.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="-ml-0.5 text-accent">
      *
    </span>
  );
}
