import { AriseMark } from "@/components/icons/AriseLogo";

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-void" role="status" aria-label="Chargement d'ARISE">
      <AriseMark className="size-16 animate-pulse-glow" />
      <p className="label tracking-[0.4em] text-arise">Initialisation du système</p>
    </div>
  );
}
