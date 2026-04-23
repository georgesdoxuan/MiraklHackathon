"use client";
import { useState } from "react";
import { C1_BRANDS } from "@/data/brands";
import { C2_SELLERS } from "@/data/sellers";
import type { Status } from "@/types";
import { T } from "@/components/tokens";
import { ProspectTable } from "@/components/ProspectTable";
import { BrandDetail } from "@/components/BrandDetail";
import { SellerDetail } from "@/components/SellerDetail";

export default function Home() {
  const [tab, setTab] = useState<"c1" | "c2">("c1");
  const [c1Status, setC1Status] = useState<Record<string, Status>>({
    carolina: "ready", bode: "ready", aje: "ready",
  });
  const [c2Status, setC2Status] = useState<Record<string, Status>>({
    stepstyle: "ready", bottega: "ready",
  });
  const [c1Selected, setC1Selected] = useState<string | null>(null);
  const [c2Selected, setC2Selected] = useState<string | null>(null);

  const generate = async (mode: "c1" | "c2", id: string) => {
    if (mode === "c1") setC1Status(s => ({ ...s, [id]: "generating" }));
    else setC2Status(s => ({ ...s, [id]: "generating" }));

    try {
      const res = await fetch(`/api/generate/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: id }),
      });
      if (!res.ok) throw new Error("API error");
    } catch {
      // Fallback to simulated generation (hardcoded data)
      await new Promise(r => setTimeout(r, 3000));
    } finally {
      if (mode === "c1") {
        setC1Status(s => ({ ...s, [id]: "ready" }));
        setC1Selected(id);
      } else {
        setC2Status(s => ({ ...s, [id]: "ready" }));
        setC2Selected(id);
      }
    }
  };

  const handleSelect = (mode: "c1" | "c2", id: string) => {
    if (mode === "c1") setC1Selected(sel => sel === id ? null : id);
    else setC2Selected(sel => sel === id ? null : id);
  };

  const generateAll = (mode: "c1" | "c2") => {
    const rows = mode === "c1" ? C1_BRANDS : C2_SELLERS;
    const statuses = mode === "c1" ? c1Status : c2Status;
    rows.filter(r => (statuses[r.id] || "pending") === "pending").forEach(r => generate(mode, r.id));
  };

  const readyC1 = Object.values(c1Status).filter(s => s === "ready").length;
  const readyC2 = Object.values(c2Status).filter(s => s === "ready").length;

  const selectedBrand = c1Selected ? C1_BRANDS.find(b => b.id === c1Selected) : null;
  const selectedSeller = c2Selected ? C2_SELLERS.find(s => s.id === c2Selected) : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: T.font, background: T.bg, overflow: "hidden" }}>
      {/* TOPBAR */}
      <div style={{ background: T.dark, padding: "0 24px", height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Mirakl logo mark */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="6" fill="#2764FF"/>
              <path d="M6 20V8l4.5 7 3.5-5.5 3.5 5.5L22 8v12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <span style={{ color: "white", fontWeight: 700, fontSize: 16, fontFamily: T.font }}>Mirakl Connect</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginLeft: 8 }}>BDR Intelligence</span>
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", gap: 2 }}>
            {[{ id: "c1", label: "Campaign 1 — Marques Luxe" }, { id: "c2", label: "Campaign 2 — Sellers" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as "c1" | "c2")} style={{
                padding: "6px 14px", borderRadius: 6,
                background: tab === t.id ? "rgba(39,100,255,0.3)" : "transparent",
                color: tab === t.id ? "#7EB3FF" : "rgba(255,255,255,0.5)",
                border: "none", cursor: "pointer", fontSize: 12,
                fontWeight: tab === t.id ? 700 : 400, fontFamily: T.font,
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ background: "rgba(39,100,255,0.2)", color: "#7EB3FF", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            C1 : {readyC1}/{C1_BRANDS.length} analysés
          </span>
          <span style={{ background: "rgba(13,124,102,0.2)", color: "#4ADE80", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            C2 : {readyC2}/{C2_SELLERS.length} analysés
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "c1" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "16px 24px", borderBottom: `1px solid ${T.border}`,
                background: T.card, display: "flex", alignItems: "center",
                justifyContent: "space-between", flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.dark, fontFamily: T.font }}>Marques Luxe — Marketplaces Françaises</div>
                  <div style={{ fontSize: 12, color: T.greyL, marginTop: 2 }}>Scoring 6 marketplaces · 24S, Printemps, GL, PdT, L&apos;Exception, La Redoute</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.greyL }}>{readyC1} analysés · {C1_BRANDS.length - readyC1} en attente</span>
                  <button onClick={() => generateAll("c1")} style={{
                    background: T.accent, color: "white", border: "none",
                    borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: T.font,
                  }}>▶ Generate all</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <ProspectTable
                  rows={C1_BRANDS}
                  mode="c1"
                  statuses={c1Status}
                  selectedId={c1Selected}
                  onGenerate={id => generate("c1", id)}
                  onSelect={id => handleSelect("c1", id)}
                />
              </div>
            </div>
            {selectedBrand && (
              <div style={{ width: 480, flexShrink: 0, height: "100%" }}>
                <BrandDetail brand={selectedBrand} onClose={() => setC1Selected(null)} />
              </div>
            )}
          </div>
        )}

        {tab === "c2" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "16px 24px", borderBottom: `1px solid ${T.border}`,
                background: T.card, display: "flex", alignItems: "center",
                justifyContent: "space-between", flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.dark, fontFamily: T.font }}>Sellers E-commerce — Marketplaces EU</div>
                  <div style={{ fontSize: 12, color: T.greyL, marginTop: 2 }}>Fit Score · GL, PdT, L&apos;Exception, La Redoute, Zalando</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.greyL }}>{readyC2} analysés · {C2_SELLERS.length - readyC2} en attente</span>
                  <button onClick={() => generateAll("c2")} style={{
                    background: T.green, color: "white", border: "none",
                    borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: T.font,
                  }}>▶ Generate all</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <ProspectTable
                  rows={C2_SELLERS}
                  mode="c2"
                  statuses={c2Status}
                  selectedId={c2Selected}
                  onGenerate={id => generate("c2", id)}
                  onSelect={id => handleSelect("c2", id)}
                />
              </div>
            </div>
            {selectedSeller && (
              <div style={{ width: 480, flexShrink: 0, height: "100%" }}>
                <SellerDetail seller={selectedSeller} onClose={() => setC2Selected(null)} />
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
