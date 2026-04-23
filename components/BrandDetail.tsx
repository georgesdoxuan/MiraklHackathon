"use client";
import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Brand } from "@/types";
import { T } from "./tokens";
import { Badge, Pill, ScoreBar } from "./Badge";

const radarCfg = { score: { label: "Score", color: T.accent } };

export function BrandDetail({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const [tab, setTab] = useState<"main" | "linkedin" | "cold">("main");

  return (
    <div style={{
      background: T.bg, borderLeft: `1px solid ${T.border}`,
      overflowY: "auto", overflowX: "hidden", height: "100%", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: T.dark, padding: "12px 20px", display: "flex",
        alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8, minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{brand.flag}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brand.name}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brand.tier} · {brand.origin}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Pill color="white" bg={T.accent}>{brand.top_score}/100 — {brand.top_match}</Pill>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "rgba(255,255,255,0.7)", cursor: "pointer",
            borderRadius: 6, padding: "4px 10px", fontSize: 12,
          }}>✕</button>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Info row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill color={T.green} bg={T.greenL}>Quick win : {brand.quick_win}</Pill>
          <Pill color="white" bg={T.dark}>{brand.strategy.replace(/_/g, " ")}</Pill>
          {brand.sustainability && <Pill color={T.green} bg={T.greenL}>♻ Sustainable</Pill>}
          <span style={{ fontSize: 11, color: T.greyL, fontFamily: T.mono }}>{brand.contact}</span>
        </div>

        {/* DNA */}
        <div style={{
          background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`,
          padding: "10px 14px", fontSize: 11, color: T.grey, fontStyle: "italic", lineHeight: 1.6,
        }}>{brand.dna}</div>

        {/* Radar + Scores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 8, fontFamily: T.font }}>Radar Scores</div>
            <ChartContainer config={radarCfg} style={{ height: 180, width: "100%" }}>
              <RadarChart data={brand.scores.map(s => ({ mp: s.mp, score: s.score, fullMark: 100 }))} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <PolarGrid stroke={T.border} />
                <PolarAngleAxis dataKey="mp" tick={{ fontSize: 9, fill: T.dark }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar dataKey="score" stroke={T.accent} fill={T.accent} fillOpacity={0.15} strokeWidth={2} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </div>

          <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 10, fontFamily: T.font }}>Détail par marketplace</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...brand.scores].sort((a, b) => b.score - a.score).map(s => (
                <div key={s.mp} style={{ display: "grid", gridTemplateColumns: "90px 1fr 60px", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.dark }}>
                    {s.full.replace("Galeries Lafayette", "GL").replace("Place des Tendances", "PdT").replace(" (LVMH)", "")}
                  </span>
                  <ScoreBar score={s.score} />
                  <Badge v={s.verdict} size="xs" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Package */}
        <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}` }}>
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.dark, fontFamily: T.font }}>Package Email</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {(["main", "linkedin", "cold"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 5,
                  border: `1px solid ${tab === t ? T.accent : T.border}`,
                  background: tab === t ? T.accentL : "transparent",
                  color: tab === t ? T.accent : T.greyL,
                  cursor: "pointer", fontWeight: tab === t ? 700 : 400,
                }}>
                  {t === "main" ? "Email" : t === "linkedin" ? "LinkedIn" : "Cold Call"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px 14px" }}>
            {tab === "main" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.greyL, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Sujet A</div>
                  <div style={{ background: T.bg, borderRadius: T.r, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: T.dark }}>{brand.subjectA.replace(/ — /g, ", ")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.greyL, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Corps · {brand.top_match}</div>
                  <div style={{ background: T.bg, borderRadius: T.r, padding: 12, fontSize: 11, color: T.dark, lineHeight: 1.75, whiteSpace: "pre-line" }}>{brand.email.replace(/ — /g, ", ")}</div>
                </div>
              </div>
            )}
            {tab === "linkedin" && (
              <div style={{ background: T.bg, borderRadius: T.r, padding: 12, fontSize: 12, color: T.dark, lineHeight: 1.7 }}>
                {brand.name}, {brand.top_score}/100 sur {brand.top_match}. {brand.dna.split("—")[1]?.trim() || brand.dna} Quick win : {brand.quick_win}. 20 min cette semaine ?
              </div>
            )}
            {tab === "cold" && (
              <div style={{ background: T.dark, borderRadius: T.r, padding: "14px 16px", fontSize: 13, color: "white", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{`J'ai scoré ${brand.name} à ${brand.top_score}/100 sur ${brand.top_match} — votre profil correspond exactement à leur audience et vous manquez à leur catalogue.`}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
