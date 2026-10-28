/**
 * Progress toward rewards (spec §7) — the one place this maths lives; the staff banner and the
 * customer home both use it.
 *
 * - Unlocked: at least one active reward is affordable. The target is the cheapest of those.
 * - Otherwise the target is the cheapest active reward not yet affordable.
 * - visitsToNext = ceil((cost − balance) / pointsPerVisit); progress = min(100, balance / cost × 100).
 */

export type RewardOption = { id: string; name: string; costPoints: number };

export type Progress = {
  balance: number;
  /** The reward the gauge measures against, or null when the store has no active rewards. */
  target: RewardOption | null;
  unlocked: boolean;
  /** Rewards the customer can redeem right now, cheapest first. */
  affordable: RewardOption[];
  visitsToNext: number;
  percent: number;
};

export function computeProgress(input: {
  balance: number;
  pointsPerVisit: number;
  rewards: RewardOption[];
}): Progress {
  const { balance, pointsPerVisit } = input;
  const rewards = [...input.rewards].sort((a, b) => a.costPoints - b.costPoints);
  const affordable = rewards.filter((reward) => reward.costPoints <= balance);
  const nextUnaffordable = rewards.find((reward) => reward.costPoints > balance) ?? null;
  const target = affordable[0] ?? nextUnaffordable;

  if (!target) {
    return { balance, target: null, unlocked: false, affordable, visitsToNext: 0, percent: 0 };
  }

  const unlocked = affordable.length > 0;
  const visitsToNext = unlocked ? 0 : Math.ceil((target.costPoints - balance) / pointsPerVisit);
  const percent = Math.min(100, (balance / target.costPoints) * 100);
  return { balance, target, unlocked, affordable, visitsToNext, percent };
}

/** "Andrei P." — how a customer is named on the staff screen. Null for accounts not signed up yet. */
export function displayName(firstName: string | null, lastName: string | null): string | null {
  if (!firstName) return null;
  return lastName ? `${firstName} ${lastName.charAt(0).toUpperCase()}.` : firstName;
}
