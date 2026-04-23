"use client";
import { useState, useEffect } from "react";
import { C1_BRANDS } from "@/data/brands";
import { C2_SELLERS } from "@/data/sellers";
import type { Status } from "@/types";
import { T } from "@/components/tokens";
import { ProspectTable } from "@/components/ProspectTable";
import { BrandDetail } from "@/components/BrandDetail";
import { SellerDetail } from "@/components/SellerDetail";
import type { Brand, Seller, Verdict } from "@/types";

const C1_SCORE_LABELS = [
  { short: "24S", full: "24S (LVMH)" },
  { short: "Printemps", full: "Printemps" },
  { short: "GL", full: "Galeries Lafayette" },
  { short: "L'Excep.", full: "L'Exception" },
  { short: "PdT", full: "Place des Tendances" },
  { short: "La Redoute", full: "La Redoute" },
];

const C2_BREAKDOWN_LABELS = ["Categorie", "Prix", "Qualite", "Volume"];

function pickString(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function pickNumber(...values: unknown[]): number | undefined {
  return values.find((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function normalizeVerdict(value: unknown, fallback: Verdict): Verdict {
  const v = typeof value === "string" ? value.toUpperCase() : "";
  if (v === "RECOMMENDED" || v === "POSSIBLE" || v === "NOT_FIT" || v === "STRONG_FIT" || v === "GOOD_FIT" || v === "WEAK_FIT") {
    return v;
  }
  return fallback;
}

function toBrand(base: Brand, raw: any): Brand {
  if (!raw) return base;

  const profile = raw.brandProfile ?? raw.profile ?? raw;
  const scoresNode = raw.scores ?? profile.scores ?? {};
  const email = raw.emailPackage ?? raw.email ?? {};

  const flatScores = Array.isArray(scoresNode.marketplace_scores)
    ? scoresNode.marketplace_scores
    : Array.isArray(scoresNode.scores)
      ? scoresNode.scores
      : Array.isArray(scoresNode)
        ? scoresNode
        : [];

  const mappedScores = C1_SCORE_LABELS.map((mp) => {
    const fromArray = flatScores.find((s: any) => {
      const name = (s?.marketplace ?? s?.mp ?? s?.name ?? s?.full ?? "").toString().toLowerCase();
      return name.includes(mp.full.toLowerCase()) || name.includes(mp.short.toLowerCase());
    });

    const fromObject = scoresNode[mp.full] ?? scoresNode[mp.short];
    const candidate = fromArray ?? fromObject ?? {};
    const baseScore = base.scores.find((s) => s.full === mp.full);

    const score = pickNumber(candidate?.score, candidate?.value, candidate, baseScore?.score) ?? 0;
    return {
      mp: mp.short,
      full: mp.full,
      score,
      verdict: normalizeVerdict(candidate?.verdict, baseScore?.verdict ?? "POSSIBLE"),
    };
  });

  const top = [...mappedScores].sort((a, b) => b.score - a.score)[0];

  return {
    ...base,
    name: pickString(profile.brand_name, profile.name, base.name) ?? base.name,
    origin: pickString(profile.origin, base.origin) ?? base.origin,
    tier: pickString(profile.tier, base.tier) ?? base.tier,
    price: pickString(profile.price_range, profile.price, base.price) ?? base.price,
    sustainability: Boolean(profile.sustainability ?? base.sustainability),
    contact: pickString(profile.contact_commercial, profile.contact, email.to, base.contact) ?? base.contact,
    dna: pickString(profile.dna, profile.positioning, profile.identity, base.dna) ?? base.dna,
    categories: Array.isArray(profile.categories) ? profile.categories : base.categories,
    scores: mappedScores,
    top_match: pickString(scoresNode.top_match, profile.top_match, top?.full, base.top_match) ?? base.top_match,
    top_score: pickNumber(scoresNode.top_score, profile.top_score, top?.score, base.top_score) ?? base.top_score,
    quick_win: pickString(scoresNode.quick_win, profile.quick_win, base.quick_win) ?? base.quick_win,
    strategy: pickString(scoresNode.pitch_strategy, profile.pitch_strategy, base.strategy) ?? base.strategy,
    subjectA: pickString(email.subjectA, email.subject_a, email.subject, base.subjectA) ?? base.subjectA,
    subjectB: pickString(email.subjectB, email.subject_b, base.subjectB) ?? base.subjectB,
    email: pickString(email.body, email.email, email.main, base.email) ?? base.email,
  };
}

function toSeller(base: Seller, raw: any): Seller {
  if (!raw) return base;

  const profile = raw.sellerProfile ?? raw.profile ?? raw;
  const email = raw.emailPackage ?? raw.email ?? {};

  const breakdownRaw = profile.breakdown ?? profile.fit_breakdown ?? {};
  const breakdown = C2_BREAKDOWN_LABELS.map((label, index) => {
    const fromObject = breakdownRaw[label] ?? breakdownRaw[label.toLowerCase()];
    const fromArray = Array.isArray(breakdownRaw) ? breakdownRaw[index]?.score ?? breakdownRaw[index] : undefined;
    return {
      label: base.breakdown[index]?.label ?? label,
      score: pickNumber(fromObject?.score, fromObject, fromArray, base.breakdown[index]?.score) ?? 0,
    };
  });

  const argsRaw = profile.arguments ?? profile.args;
  const args = Array.isArray(argsRaw) && argsRaw.length > 0
    ? argsRaw.slice(0, 3).map((a: any) => ({
        title: pickString(a.title, a.headline, a.argument, "Argument") ?? "Argument",
        body: pickString(a.body, a.details, a.text, "") ?? "",
        mp: pickString(a.marketplace, a.mp, a.target, base.top_match) ?? base.top_match,
      }))
    : base.args;

  const fit = pickNumber(profile.fit_score, profile.fit, base.fit) ?? base.fit;

  return {
    ...base,
    name: pickString(profile.seller_name, profile.name, base.name) ?? base.name,
    categories: Array.isArray(profile.main_categories) ? profile.main_categories : base.categories,
    skus: pickNumber(profile.active_skus_estimate, profile.skus, base.skus) ?? base.skus,
    price: pickNumber(profile.price_average, profile.price, base.price) ?? base.price,
    rating: pickNumber(profile.rating, base.rating) ?? base.rating,
    reviews: pickNumber(profile.rating_count, profile.reviews, base.reviews) ?? base.reviews,
    fulfillment: pickString(profile.fulfillment_type, profile.fulfillment, base.fulfillment) ?? base.fulfillment,
    intl: Boolean(profile.ships_internationally ?? profile.intl ?? base.intl),
    fit,
    verdict: normalizeVerdict(profile.verdict, base.verdict),
    priority: (pickString(profile.outreach_priority, profile.priority, base.priority) as Seller["priority"]) ?? base.priority,
    top_match: pickString(profile.top_match, base.top_match) ?? base.top_match,
    top_score: pickNumber(profile.top_score, fit, base.top_score) ?? base.top_score,
    quick_win: pickString(profile.quick_win, base.quick_win) ?? base.quick_win,
    breakdown,
    args,
    subjectA: pickString(email.subjectA, email.subject_a, email.subject, base.subjectA) ?? base.subjectA,
    subjectB: pickString(email.subjectB, email.subject_b, base.subjectB) ?? base.subjectB,
    email: pickString(email.body, email.email, email.main, base.email) ?? base.email,
  };
}

export default function Home() {
  const [tab, setTab] = useState<"c1" | "c2">("c1");
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    fetch("/api/gmail/status")
      .then(r => r.json())
      .then(d => setGmailConnected(d.connected));

    // Handle redirect back from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  const [c1Status, setC1Status] = useState<Record<string, Status>>({
    carolina: "ready", bode: "ready", aje: "ready",
  });
  const [c2Status, setC2Status] = useState<Record<string, Status>>({
    stepstyle: "ready", bottega: "ready",
  });
  const [c1Selected, setC1Selected] = useState<string | null>(null);
  const [c2Selected, setC2Selected] = useState<string | null>(null);
  // Stores Dust-generated data per prospect ID (overrides hardcoded data when present)
  const [dustResults, setDustResults] = useState<Record<string, any>>({});

  const generate = async (mode: "c1" | "c2", id: string) => {
    if (mode === "c1") setC1Status(s => ({ ...s, [id]: "generating" }));
    else setC2Status(s => ({ ...s, [id]: "generating" }));

    let success = false;
    try {
      const res = await fetch(`/api/generate/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDustResults(prev => ({ ...prev, [id]: json.data }));
          success = true;
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      if (success) {
        if (mode === "c1") {
          setC1Status(s => ({ ...s, [id]: "ready" }));
          setC1Selected(id);
        } else {
          setC2Status(s => ({ ...s, [id]: "ready" }));
          setC2Selected(id);
        }
      } else if (mode === "c1") {
        setC1Status(s => ({ ...s, [id]: "pending" }));
      } else {
        setC2Status(s => ({ ...s, [id]: "pending" }));
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

  const c1Rows = C1_BRANDS.map((brand) => toBrand(brand, dustResults[brand.id]));
  const c2Rows = C2_SELLERS.map((seller) => toSeller(seller, dustResults[seller.id]));

  const readyC1 = Object.values(c1Status).filter(s => s === "ready").length;
  const readyC2 = Object.values(c2Status).filter(s => s === "ready").length;

  const selectedBrand = c1Selected ? c1Rows.find(b => b.id === c1Selected) ?? null : null;
  const selectedSeller = c2Selected ? c2Rows.find(s => s.id === c2Selected) ?? null : null;

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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {gmailConnected ? (
            <span style={{ background: "rgba(13,124,102,0.25)", color: "#4ADE80", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
              Gmail connecté
            </span>
          ) : (
            <a href="/api/auth/gmail" style={{ background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/></svg>
              Connecter Gmail
            </a>
          )}
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
                  rows={c1Rows}
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
                  rows={c2Rows}
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
