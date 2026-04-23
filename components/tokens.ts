export const T = {
  dark: "#03182F", accent: "#2764FF", accentL: "#E6F0FF",
  bg: "#F2F8FF", card: "#FFFFFF",
  pink: "#F22E75", pinkL: "#FFE7EC",
  green: "#0D7C66", greenL: "#E6F7F4",
  amber: "#B45309", amberL: "#FFF7E6",
  grey: "#30373E", greyL: "#64748B",
  border: "#E2EAF4",
  font: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  mono: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  r: "8px", r2: "12px",
  sh: "0 1px 3px rgba(0,0,0,0.07)",
  shMd: "0 4px 12px rgba(0,0,0,0.09)",
} as const;

export const VC: Record<string, { bg: string; color: string; label: string }> = {
  RECOMMENDED: { bg: T.accentL, color: T.accent, label: "Match" },
  STRONG_FIT: { bg: T.accentL, color: T.accent, label: "Strong Fit" },
  POSSIBLE: { bg: T.amberL, color: T.amber, label: "Possible" },
  GOOD_FIT: { bg: T.amberL, color: T.amber, label: "Good Fit" },
  NOT_FIT: { bg: T.pinkL, color: T.pink, label: "Not Fit" },
  WEAK_FIT: { bg: T.pinkL, color: T.pink, label: "Weak Fit" },
};
