import { Section } from "./Section";

const steps = [
  "Customer phone: create an account. You start at 0 / 100.",
  "Cashier phone: type that phone number and tap Add visit (+5).",
  "Customer phone, without touching it: 5 / 100 appears within a few seconds.",
  "Keep adding visits until 100. The customer sees Free coffee unlocked and taps Redeem.",
  "Cashier phone: type the 6-digit code from the customer's screen and tap Redeem. The customer is back at 0.",
  "Bonus: at the counter, type a number nobody has used. It gets 5 points straight away; signing up with that number later keeps them.",
];

/** The whole flow (spec §0) as a short checklist. */
export function TryIt() {
  return (
    <Section title="3. Try the whole flow">
      <ol className="flex max-w-3xl list-decimal flex-col gap-2 pl-5 text-ink-muted marker:text-accent">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </Section>
  );
}
