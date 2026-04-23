"use client";
import { BarChart, Bar, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Seller } from "@/types";
import { T, VC } from "./tokens";
import { Pill } from "./Badge";

const barCfg = { score: { label: "Score", color: "#2764FF" } };

export function SellerDetail({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  const v = VC[seller.verdict];
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
          <span style={{ fontSize: 20, flexShrink: 0 }}>{seller.flag}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seller.name}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seller.categories.join(" · ")}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>{seller.fit}/100</span>
          <span style={{ background: v.bg, color: v.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{v.label}</span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "rgba(255,255,255,0.7)", cursor: "pointer",
            borderRadius: 6, padding: "4px 10px", fontSize: 12,
          }}>✕</button>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill color={T.green} bg={T.greenL}>Quick win : {seller.quick_win}</Pill>
          <Pill color="white" bg={T.dark}>Top Match : {seller.top_match}</Pill>
          <Pill
            color={seller.priority === "HIGH" ? T.accent : T.amber}
            bg={seller.priority === "HIGH" ? T.accentL : T.amberL}
          >
            Priorité {seller.priority}
          </Pill>
        </div>

        {/* Profile + Chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 10, fontFamily: T.font }}>Profil Seller</div>
            {[
              ["SKUs", String(seller.skus)],
              ["Prix moyen", `${seller.price}€`],
              ["Note", `${seller.rating}★ (${seller.reviews} avis)`],
              ["Fulfillment", seller.fulfillment],
              ["Depuis", String(seller.since)],
              ["International", seller.intl ? "✓ Oui" : "✗ France only"],
            ].map(([k, val]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 11, color: T.greyL }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.dark }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 8, fontFamily: T.font }}>Fit Score / 100</div>
            <ChartContainer config={barCfg} style={{ height: 140, width: "100%" }}>
              <BarChart data={seller.breakdown} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 40]} hide />
                <Bar dataKey="score" radius={4} fill={T.accent} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Arguments */}
        <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 10, fontFamily: T.font }}>Arguments de Conversion</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {seller.args.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: T.accent,
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.dark }}>{a.title}</span>
                    <Pill color={T.accent} bg={T.accentL}>{a.mp}</Pill>
                  </div>
                  <div style={{ fontSize: 11, color: T.grey, lineHeight: 1.6 }}>{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email */}
        <div style={{ background: T.card, borderRadius: T.r, border: `1px solid ${T.border}`, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.dark, fontFamily: T.font }}>Email · {seller.top_match}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.greyL, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Sujet A</div>
            <div style={{ background: T.bg, borderRadius: T.r, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: T.dark }}>{seller.subjectA.replace(/ — /g, ", ")}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.greyL, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Corps</div>
          <div style={{ background: T.bg, borderRadius: T.r, padding: 12, fontSize: 11, color: T.dark, lineHeight: 1.75, whiteSpace: "pre-line" }}>{seller.email.replace(/ — /g, ", ")}</div>
        </div>
      </div>
    </div>
  );
}
