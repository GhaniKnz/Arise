import { db } from "../index";
import { patch, stamp } from "../repo";
import type { Profile } from "../types";
import { computeTargets } from "@/lib/domain/energy";

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get("me");
}

export async function saveProfile(data: Omit<Profile, "id" | "createdAt" | "updatedAt">) {
  const existing = await getProfile();
  if (existing) await patch(db.profile, "me", data);
  else await db.profile.add(stamp<Profile>({ ...data, id: "me" }));
}

export async function updateProfile(changes: Partial<Profile>) {
  await patch(db.profile, "me", changes);
}

/** Recomputes auto targets from the latest weight (called after a weigh-in or settings change). */
export async function refreshAutoTargets(currentWeightKg: number, adaptiveTdee?: number) {
  const p = await getProfile();
  if (!p || p.targetsMode !== "auto") return;
  const t = computeTargets({
    sex: p.sex,
    age: new Date().getFullYear() - p.birthYear,
    heightCm: p.heightCm,
    weightKg: currentWeightKg,
    activity: p.activity,
    goal: p.goal,
    weeklyRatePct: p.weeklyRatePct,
    targetWeightKg: p.targetWeightKg,
    adaptiveTdee,
  });
  const { maintenance: _m, dailyDelta: _d, ...targets } = t;
  // Keep user-chosen lifestyle targets.
  await patch(db.profile, "me", { targets: { ...targets, steps: p.targets.steps, sleepMin: p.targets.sleepMin, waterMl: p.targets.waterMl } });
}
