type FormAlertProps = {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
};

/** Message about the whole form. role="alert" so screen readers announce it when it appears. */
export function FormAlert({ tone, children }: FormAlertProps) {
  const toneClass = {
    error: "border-danger text-danger",
    success: "border-brand text-ink",
    info: "border-line-strong text-ink",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[var(--radius-md)] border-l-4 bg-sunken px-4 py-3 font-semibold ${toneClass}`}
    >
      {children}
    </div>
  );
}
