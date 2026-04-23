"use client";
import { useState, useEffect } from "react";
import { T } from "./tokens";

const C1_STEPS = [
  "Analyse du site web de la marque…",
  "Extraction du profil JSON…",
  "Scoring 6 marketplaces…",
  "Identification top match & quick win…",
  "Génération du package email…",
];

const C2_STEPS = [
  "Analyse de la boutique Amazon…",
  "Extraction du profil seller…",
  "Scoring 5 marketplaces…",
  "Calcul du Fit Score…",
  "Génération du package email…",
];

export function GeneratingCell({ mode }: { mode: "c1" | "c2" }) {
  const steps = mode === "c1" ? C1_STEPS : C2_STEPS;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 550);
      return () => clearTimeout(t);
    }
  }, [step, steps.length]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 14, height: 14, minWidth: 14, minHeight: 14, borderRadius: "50%",
        border: `2px solid ${T.accent}`, borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite", flexShrink: 0, aspectRatio: "1 / 1",
      }} />
      <span style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>{steps[step]}</span>
    </div>
  );
}
