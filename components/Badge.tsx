"use client";
import { VC } from "./tokens";

export function Badge({ v, size = "sm" }: { v: string; size?: "sm" | "xs" }) {
  const c = VC[v] || VC.NOT_FIT;
  return (
    <span style={{
      background: c.bg, color: c.color, borderRadius: 4,
      padding: size === "xs" ? "1px 5px" : "2px 8px",
      fontSize: size === "xs" ? 10 : 11,
      fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

export function Pill({
  children, color = "#2764FF", bg = "#E6F0FF",
}: {
  children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <span style={{
      background: bg, color, borderRadius: 20,
      padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "#2764FF" : score >= 50 ? "#B45309" : "#F22E75";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height: 5, background: "#E2EAF4", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#03182F", minWidth: 26, textAlign: "right" }}>{score}</span>
    </div>
  );
}
