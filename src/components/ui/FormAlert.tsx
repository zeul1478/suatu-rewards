import { Icon, type IconName } from "./icons/Icon";

type FormAlertProps = {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
};

const tones: Record<FormAlertProps["tone"], { icon: IconName; className: string }> = {
  error: { icon: "alert", className: "border-danger text-danger" },
  success: { icon: "check", className: "border-brand text-ink" },
  info: { icon: "info", className: "border-line-strong text-ink" },
};

/** Message about the whole form. role="alert" so screen readers announce it when it appears. */
export function FormAlert({ tone, children }: FormAlertProps) {
  const { icon, className } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-[var(--radius-md)] border-l-4 bg-sunken px-4 py-3 font-semibold ${className}`}
    >
      <Icon name={icon} size={20} className="mt-0.5" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
