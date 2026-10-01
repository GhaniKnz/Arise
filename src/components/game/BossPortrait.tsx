import Image from "next/image";
import type { Boss } from "@/lib/domain/bosses";

const PORTRAITS: Record<string, string> = {
  cookie: "goblin",
  drumstick: "goblin",
  mountain: "golem",
  candy: "specter",
  ghost: "specter",
  shield: "knight",
  waves: "hydra",
};

export function BossPortrait({ boss, className = "" }: { boss: Pick<Boss, "name" | "icon" | "final">; className?: string }) {
  const portrait = boss.name.startsWith("Titan") ? "titan"
    : boss.final || boss.name.startsWith("Seigneur") ? "lord"
    : PORTRAITS[boss.icon] ?? (boss.name.startsWith("Golem") ? "golem"
      : boss.name.startsWith("Spectre") ? "specter"
      : boss.name.startsWith("Chevalier") ? "knight"
      : boss.name.startsWith("Hydre") ? "hydra" : "goblin");
  return (
    <Image
      src={`/art/bosses/${portrait}.webp`}
      alt=""
      aria-hidden
      width={256}
      height={256}
      sizes="44px"
      className={`pointer-events-none size-full object-contain ${className}`}
    />
  );
}
