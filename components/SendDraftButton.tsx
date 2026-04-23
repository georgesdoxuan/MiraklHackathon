"use client";
import { useState } from "react";
import { T } from "./tokens";

type State = "idle" | "loading" | "success" | "error" | "unauth";

export function SendDraftButton({
  to, subject, body,
}: {
  to?: string;
  subject: string;
  body: string;
}) {
  const [state, setState] = useState<State>("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });

      if (res.status === 401) { setState("unauth"); return; }
      if (!res.ok) throw new Error();

      setState("success");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const config: Record<State, { label: string; bg: string; color: string }> = {
    idle:   { label: "📤 Envoyer en brouillon", bg: T.accentL, color: T.accent },
    loading:{ label: "Envoi...",                bg: T.border,  color: T.greyL  },
    success:{ label: "✓ Brouillon créé",        bg: T.greenL,  color: T.green  },
    error:  { label: "Erreur — réessayer",       bg: T.pinkL,   color: T.pink   },
    unauth: { label: "Connecter Gmail d'abord",  bg: T.amberL,  color: T.amber  },
  };

  const c = config[state];

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      style={{
        background: c.bg, color: c.color,
        border: "none", borderRadius: 6,
        padding: "5px 12px", fontSize: 11, fontWeight: 700,
        cursor: state === "loading" ? "not-allowed" : "pointer",
        fontFamily: T.font, whiteSpace: "nowrap", transition: "all 0.2s",
      }}
    >
      {c.label}
    </button>
  );
}
