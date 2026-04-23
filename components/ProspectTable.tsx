"use client";
import type { Brand, Seller, Status } from "@/types";
import { T } from "./tokens";
import { Badge } from "./Badge";
import { GeneratingCell } from "./GeneratingCell";

type Row = Brand | Seller;

function isBrand(row: Row): row is Brand {
  return "dna" in row;
}

export function ProspectTable({
  rows, mode, statuses, selectedId, onGenerate, onSelect,
}: {
  rows: Row[];
  mode: "c1" | "c2";
  statuses: Record<string, Status>;
  selectedId: string | null;
  onGenerate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const TH = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <th style={{
      padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600,
      color: T.greyL, textTransform: "uppercase", letterSpacing: "0.05em",
      background: T.bg, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", ...style,
    }}>{children}</th>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.font }}>
        <thead>
          <tr>
            <TH>Prospect</TH>
            {mode === "c1" ? <TH>Tier</TH> : <TH>SKUs · Prix</TH>}
            {mode === "c1" ? <TH>Origine</TH> : <TH>Fulfillment</TH>}
            {mode === "c1" ? <TH>Prix</TH> : <TH>Note</TH>}
            <TH style={{ width: 180, minWidth: 180 }}>Statut</TH>
            <TH>Top Match</TH>
            <TH>Score</TH>
            <TH>Action</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = statuses[row.id] || "pending";
            const isSelected = selectedId === row.id;
            const brand = isBrand(row) ? row : null;
            const seller = !isBrand(row) ? row as Seller : null;

            return (
              <tr
                key={row.id}
                onClick={() => status === "ready" && onSelect(row.id)}
                style={{
                  background: isSelected ? T.accentL : "white",
                  borderBottom: `1px solid ${T.border}`,
                  cursor: status === "ready" ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{row.flag}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{row.name}</div>
                      <div style={{ fontSize: 10, color: T.greyL }}>{row.categories.slice(0, 2).join(" · ")}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: T.grey }}>
                  {brand ? brand.tier : `${seller!.skus} SKUs · ${seller!.price}€`}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: T.grey }}>
                  {brand ? `${brand.flag} ${brand.origin}` : seller!.fulfillment}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: T.grey }}>
                  {brand ? brand.price : `${seller!.rating}★ (${seller!.reviews})`}
                </td>
                <td style={{ padding: "10px 12px", width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden" }}>
                  {status === "pending" && (
                    <span style={{ fontSize: 11, color: T.greyL, background: T.bg, borderRadius: 4, padding: "2px 8px", fontWeight: 500 }}>Non analysé</span>
                  )}
                  {status === "generating" && <GeneratingCell mode={mode} />}
                  {status === "ready" && (
                    <span style={{ fontSize: 11, color: T.green, background: T.greenL, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>✓ Prêt</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {status === "ready"
                    ? <span style={{ fontSize: 12, fontWeight: 600, color: T.dark }}>{row.top_match}</span>
                    : <span style={{ fontSize: 11, color: T.border }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {status === "ready" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 50, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${row.top_score}%`, height: "100%", background: row.top_score >= 75 ? T.accent : T.amber, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.dark }}>{row.top_score}</span>
                    </div>
                  ) : <span style={{ fontSize: 11, color: T.border }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {status === "pending" && (
                    <button onClick={(e) => { e.stopPropagation(); onGenerate(row.id); }} style={{
                      background: T.accent, color: "white", border: "none",
                      borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: T.font, boxShadow: T.sh,
                    }}>▶ Generate</button>
                  )}
                  {status === "generating" && (
                    <button disabled style={{
                      background: T.border, color: T.greyL, border: "none",
                      borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "not-allowed", fontFamily: T.font,
                    }}>En cours…</button>
                  )}
                  {status === "ready" && (
                    <button onClick={(e) => { e.stopPropagation(); onSelect(row.id); }} style={{
                      background: isSelected ? "white" : T.accentL, color: T.accent,
                      border: `1px solid ${T.accentL}`, borderRadius: 6,
                      padding: "5px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: T.font,
                    }}>{isSelected ? "Masquer" : "Voir ↗"}</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
