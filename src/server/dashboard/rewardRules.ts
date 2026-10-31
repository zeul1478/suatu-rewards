import "server-only";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

/** Same bounds as the database checks (20261031100000_messages.sql). */
export const BONUS_POINTS_MAX = 10000;
export const DOUBLE_MULTIPLIER_MIN = 2;
export const DOUBLE_MULTIPLIER_MAX = 5;
export const EXPIRE_MONTHS_MIN = 3;
export const EXPIRE_MONTHS_MAX = 36;

/** Extra ways to earn and keep points (D84). null = off, which is the default for each. */
export type RewardRules = {
  welcomeBonus: number | null;
  birthdayBonus: number | null;
  doubleMultiplier: number | null;
  /** "YYYY-MM-DD", store calendar days, both included. */
  doubleFrom: string | null;
  doubleTo: string | null;
  expireAfterMonths: number | null;
};

export async function getRewardRules(store: Store): Promise<RewardRules> {
  const { data, error } = await supabaseAdmin()
    .from("stores")
    .select(
      "welcome_bonus_points, birthday_bonus_points, double_points_multiplier, double_points_from, double_points_to, points_expire_after_months",
    )
    .eq("id", store.id)
    .single();
  if (error) throw new Error(`Reward rules read failed: ${error.message}`);
  return {
    welcomeBonus: data.welcome_bonus_points,
    birthdayBonus: data.birthday_bonus_points,
    doubleMultiplier: data.double_points_multiplier,
    doubleFrom: data.double_points_from,
    doubleTo: data.double_points_to,
    expireAfterMonths: data.points_expire_after_months,
  };
}

export async function updateRewardRules(
  store: Store,
  manager: StaffMember,
  rules: RewardRules,
): Promise<void> {
  const before = await getRewardRules(store);
  const { error } = await supabaseAdmin()
    .from("stores")
    .update({
      welcome_bonus_points: rules.welcomeBonus,
      birthday_bonus_points: rules.birthdayBonus,
      double_points_multiplier: rules.doubleMultiplier,
      double_points_from: rules.doubleMultiplier ? rules.doubleFrom : null,
      double_points_to: rules.doubleMultiplier ? rules.doubleTo : null,
      points_expire_after_months: rules.expireAfterMonths,
    })
    .eq("id", store.id);
  if (error) throw new Error(`Reward rules update failed: ${error.message}`);
  const changes = Object.fromEntries(
    (Object.keys(rules) as (keyof RewardRules)[])
      .filter((key) => before[key] !== rules[key])
      .map((key) => [key, { from: before[key], to: rules[key] }]),
  );
  if (Object.keys(changes).length === 0) return;
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "store.reward_rules_changed",
    details: changes,
  });
}
