"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarRange, Dumbbell, Flame, Scale, Sparkles, Swords, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AriseMark } from "@/components/icons/AriseLogo";
import { Background } from "@/components/layout/Background";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Chip, Field, NumberInput, Segmented, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { defaultSplitKey, SPLIT_BY_KEY, SPLIT_PRESETS } from "@/lib/data/routines";
import { createProfile, previewTargets, seedDemo, type OnboardingAnswers } from "@/lib/db/seed";
import type { ActivityLevel, Experience, GoalType } from "@/lib/db/types";
import { ACTIVITY_LABELS, bmi, GOAL_LABELS } from "@/lib/domain/energy";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { WEEKDAYS_SHORT } from "@/lib/utils/date";
import { fmtDec, fmtInt } from "@/lib/utils/format";

const GOAL_ICONS: Record<GoalType, React.ReactNode> = {
  cut: <Flame />,
  bulk: <Dumbbell />,
  recomp: <Swords />,
  maintain: <Target />,
};

const STEPS = ["name", "goal", "body", "target", "activity", "training", "result"] as const;
type Step = (typeof STEPS)[number] | "welcome";

const DEFAULTS: OnboardingAnswers = {
  name: "",
  goal: "cut",
  sex: "male",
  age: 28,
  heightCm: 178,
  weightKg: 80,
  targetWeightKg: 73,
  activity: "moderate",
  sessionsPerWeek: 4,
  experience: "intermediate",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, profile } = useGame();
  const [step, setStep] = useState<Step>("welcome");
  const [dir, setDir] = useState(1);
  const [a, setA] = useState<OnboardingAnswers>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [splitKey, setSplitKey] = useState<string | null>(null);

  useEffect(() => {
    if (ready && profile && !busy) router.replace("/");
  }, [ready, profile, busy, router]);

  const idx = step === "welcome" ? -1 : STEPS.indexOf(step);
  const go = (to: Step, d = 1) => {
    setDir(d);
    setStep(to);
  };
  const next = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)], 1);
  const back = () => go(idx <= 0 ? "welcome" : STEPS[idx - 1], -1);
  const set = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) => setA((s) => ({ ...s, [k]: v }));

  const targets = useMemo(() => previewTargets(a), [a]);
  const bmiValue = bmi(a.weightKg, a.heightCm);

  const valid: Record<Step, boolean> = {
    welcome: true,
    name: a.name.trim().length > 0,
    goal: true,
    body: a.age >= 14 && a.age <= 100 && a.heightCm >= 120 && a.heightCm <= 230 && a.weightKg >= 30 && a.weightKg <= 300,
    target: a.targetWeightKg >= 30 && a.targetWeightKg <= 300,
    activity: true,
    training: true,
    result: true,
  };

  const finish = async () => {
    setBusy(true);
    try {
      const preset = SPLIT_BY_KEY.get(splitKey ?? defaultSplitKey(a.sessionsPerWeek, a.experience));
      await createProfile(a, preset && preset.days === a.sessionsPerWeek ? { split: { templates: preset.templates, schedule: preset.schedule } } : {});
      router.replace("/");
    } catch (e) {
      setBusy(false);
      toast({ tone: "error", title: "Impossible de créer le profil", message: e instanceof Error ? e.message : undefined });
    }
  };

  const demo = async () => {
    setBusy(true);
    try {
      await seedDemo();
      router.replace("/");
    } catch (e) {
      setBusy(false);
      toast({ tone: "error", title: "Échec du chargement de la démo", message: e instanceof Error ? e.message : undefined });
    }
  };

  const onGoal = (g: GoalType) => {
    set("goal", g);
    if (g === "cut") set("targetWeightKg", Math.round(a.weightKg * 0.91));
    else if (g === "bulk") set("targetWeightKg", Math.round(a.weightKg * 1.06));
    else set("targetWeightKg", a.weightKg);
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Background />
      {step !== "welcome" && (
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pt-[calc(1rem+var(--safe-top))]">
          <button type="button" onClick={back} className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-white/5" aria-label="Retour">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex flex-1 gap-1.5" aria-label={`Étape ${idx + 1} sur ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= idx ? "bg-arise shadow-[0_0_8px_#4da3ff]" : "bg-white/10")} />
            ))}
          </div>
        </div>
      )}

      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-6 pb-[calc(1.5rem+var(--safe-bottom))]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col"
          >
            {step === "welcome" && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
                  <AriseMark className="size-24 drop-shadow-[0_0_30px_rgb(77_163_255/0.6)]" />
                </motion.div>
                <p className="label mt-8 text-arise">[ Notification du système ]</p>
                <h1 className="text-glow mt-3 font-display text-5xl font-bold tracking-[0.25em] text-white">ARISE</h1>
                <p className="mt-4 max-w-sm text-lg text-ink-2">Tu as été choisi. Chaque repas, chaque série, chaque pas devient de l&apos;expérience.</p>
                <p className="mt-2 max-w-sm text-sm text-ink-3">Nutrition, entraînement, corps et récupération réunis dans un seul système de progression.</p>
                <div className="mt-10 w-full max-w-sm space-y-3">
                  <Button size="lg" block onClick={() => go("name")}>
                    Commencer l&apos;éveil <ArrowRight />
                  </Button>
                  <Button size="lg" variant="secondary" block onClick={demo} disabled={busy}>
                    <Sparkles /> Explorer avec des données de démo
                  </Button>
                </div>
                <p className="mt-6 text-xs text-ink-3">Tes données restent privées, sur cet appareil.</p>
              </div>
            )}

            {step === "name" && (
              <StepFrame title="Comment dois-je t'appeler, Chasseur ?" subtitle="Ton nom apparaîtra sur ta fiche de statut.">
                <TextInput
                  data-autofocus
                  autoFocus
                  value={a.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ton prénom"
                  maxLength={30}
                  className="h-14 text-center font-display text-2xl"
                  onKeyDown={(e) => e.key === "Enter" && valid.name && next()}
                  aria-label="Prénom"
                />
              </StepFrame>
            )}

            {step === "goal" && (
              <StepFrame title="Quel est ton objectif ?" subtitle="Tu pourras le changer à tout moment.">
                <div className="space-y-2.5">
                  {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                    <ChoiceCard key={g} selected={a.goal === g} onClick={() => onGoal(g)} title={GOAL_LABELS[g].label} description={GOAL_LABELS[g].hint} icon={GOAL_ICONS[g]} />
                  ))}
                </div>
              </StepFrame>
            )}

            {step === "body" && (
              <StepFrame title="Tes mensurations" subtitle="Pour estimer ta dépense énergétique.">
                <div className="space-y-4">
                  <Field label="Sexe">
                    <Segmented
                      value={a.sex}
                      onChange={(v) => set("sex", v)}
                      options={[
                        { value: "male", label: "Homme" },
                        { value: "female", label: "Femme" },
                      ]}
                      ariaLabel="Sexe"
                    />
                  </Field>
                  <Field label="Âge">
                    <NumberInput value={a.age} onChange={(v) => set("age", Math.round(v ?? 0))} min={14} max={100} unit="ans" decimals={0} />
                  </Field>
                  <Field label="Taille">
                    <NumberInput value={a.heightCm} onChange={(v) => set("heightCm", Math.round(v ?? 0))} min={120} max={230} unit="cm" decimals={0} />
                  </Field>
                  <Field label="Poids actuel">
                    <NumberInput value={a.weightKg} onChange={(v) => set("weightKg", v ?? 0)} step={0.5} min={30} max={300} unit="kg" />
                  </Field>
                  {valid.body && <p className="text-center text-xs text-ink-3">IMC : {fmtDec(bmiValue)}. Indicateur populationnel : il ne distingue pas muscle et graisse.</p>}
                </div>
              </StepFrame>
            )}

            {step === "target" && (
              <StepFrame title="Ton objectif de poids" subtitle={a.goal === "cut" ? "Une sèche durable vise −0,5 à −0,7 % du poids par semaine." : "Indicatif : ta progression sera suivie sur la tendance."}>
                <div className="space-y-4">
                  <NumberInput value={a.targetWeightKg} onChange={(v) => set("targetWeightKg", v ?? 0)} step={0.5} min={30} max={300} unit="kg" size="lg" ariaLabel="Poids objectif" />
                  <div className="panel p-4 text-center">
                    <p className="label">Écart</p>
                    <p className="mt-1 font-display text-3xl font-bold text-ink">
                      {a.targetWeightKg - a.weightKg > 0 ? "+" : ""}
                      {fmtDec(a.targetWeightKg - a.weightKg)} kg
                    </p>
                    {a.goal === "cut" && a.targetWeightKg < a.weightKg && (
                      <p className="mt-1 text-sm text-ink-3">≈ {Math.ceil((a.weightKg - a.targetWeightKg) / ((a.weightKg * 0.6) / 100))} semaines à −0,6 %/semaine</p>
                    )}
                  </div>
                </div>
              </StepFrame>
            )}

            {step === "activity" && (
              <StepFrame title="Ton niveau d'activité" subtitle="Hors séances de musculation, au quotidien.">
                <div className="space-y-2.5">
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => (
                    <ChoiceCard key={lvl} selected={a.activity === lvl} onClick={() => set("activity", lvl)} title={ACTIVITY_LABELS[lvl].label} description={ACTIVITY_LABELS[lvl].hint} />
                  ))}
                </div>
              </StepFrame>
            )}

            {step === "training" && (
              <StepFrame title="Ton entraînement" subtitle="ARISE crée ton programme et ton planning de départ.">
                <div className="space-y-6">
                  <Field label="Séances par semaine">
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6].map((n) => (
                        <Chip key={n} active={a.sessionsPerWeek === n} onClick={() => set("sessionsPerWeek", n)} className="h-12 flex-1 justify-center font-display text-lg">
                          {n}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <div className="space-y-2.5">
                    <p className="text-[13px] font-medium text-ink-2">Organisation de la semaine</p>
                    {SPLIT_PRESETS.filter((p) => p.days === a.sessionsPerWeek).map((p) => (
                      <ChoiceCard
                        key={p.key}
                        selected={(splitKey && SPLIT_BY_KEY.get(splitKey)?.days === a.sessionsPerWeek ? splitKey : defaultSplitKey(a.sessionsPerWeek, a.experience)) === p.key}
                        onClick={() => setSplitKey(p.key)}
                        title={p.label}
                        description={`${p.description} · ${p.schedule.map((k, i) => (k ? WEEKDAYS_SHORT[i] : null)).filter(Boolean).join(", ")}`}
                        icon={<CalendarRange />}
                      />
                    ))}
                    <p className="text-[11px] text-ink-3">Tu pourras renommer chaque séance, changer les exercices et les jours à tout moment.</p>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[13px] font-medium text-ink-2">Expérience en musculation</p>
                    {(
                      [
                        ["beginner", "Débutant", "Moins d'un an de pratique régulière"],
                        ["intermediate", "Intermédiaire", "1 à 3 ans, bases techniques maîtrisées"],
                        ["advanced", "Avancé", "Plus de 3 ans, progression plus lente"],
                      ] as [Experience, string, string][]
                    ).map(([v, t, d]) => (
                      <ChoiceCard key={v} selected={a.experience === v} onClick={() => set("experience", v)} title={t} description={d} />
                    ))}
                  </div>
                </div>
              </StepFrame>
            )}

            {step === "result" && (
              <StepFrame title="Évaluation du Système" subtitle={`${a.name}, voici ta configuration de départ.`}>
                <div className="space-y-4">
                  <div className="panel panel-glow hud p-5 text-center">
                    <p className="label">Calories objectif</p>
                    <p className="text-glow mt-1 font-display text-5xl font-bold text-white">{fmtInt(targets.kcal)}</p>
                    <p className="text-sm text-ink-3">
                      kcal/jour · maintenance estimée {fmtInt(targets.maintenance)} ({targets.dailyDelta > 0 ? "+" : ""}
                      {fmtInt(targets.dailyDelta)})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      ["Protéines", `${targets.protein} g`, "var(--color-protein)"],
                      ["Glucides", `${targets.carbs} g`, "var(--color-carbs)"],
                      ["Lipides", `${targets.fat} g`, "var(--color-fat)"],
                      ["Fibres", `${targets.fiber} g`, "var(--color-fiber)"],
                      ["Pas", fmtInt(targets.steps), "var(--color-arise)"],
                      ["Eau", `${fmtDec(targets.waterMl / 1000)} L`, "var(--color-cyan)"],
                      ["Sommeil", "7 h 30", "var(--color-violet-2)"],
                      ["Séances", `${a.sessionsPerWeek}/sem.`, "var(--color-good)"],
                    ].map(([l, v, c]) => (
                      <div key={l} className="rounded-2xl border border-line bg-deep/60 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                          <span className="size-1.5 rounded-full" style={{ background: c }} />
                          {l}
                        </div>
                        <p className="mt-0.5 font-display text-lg font-semibold text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                  <Notice>
                    Ce sont des <strong>estimations de départ</strong> (formule de Mifflin-St Jeor). Après 2–3 semaines de saisie, ARISE calcule ta maintenance réelle à partir de l&apos;évolution de ton poids pour ajuster.
                  </Notice>
                  <p className="flex items-center justify-center gap-2 text-xs text-ink-3">
                    <Scale className="size-3.5" /> Aucune donnée n&apos;est envoyée : tout reste sur ton appareil.
                  </p>
                </div>
              </StepFrame>
            )}
          </motion.div>
        </AnimatePresence>

        {step !== "welcome" && (
          <div className="mt-6">
            {step === "result" ? (
              <Button size="lg" block onClick={finish} disabled={busy} className="font-display tracking-[0.2em]">
                ARISE
              </Button>
            ) : (
              <Button size="lg" block onClick={next} disabled={!valid[step]}>
                Continuer <ArrowRight />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StepFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="font-display text-2xl font-bold tracking-wide text-ink sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-3">{subtitle}</p>}
      <div className="mt-6 flex-1">{children}</div>
    </div>
  );
}
