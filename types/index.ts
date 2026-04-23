export type Verdict = "RECOMMENDED" | "POSSIBLE" | "NOT_FIT" | "STRONG_FIT" | "GOOD_FIT" | "WEAK_FIT";
export type Status = "pending" | "generating" | "ready";

export interface MarketplaceScore {
  mp: string;
  full: string;
  score: number;
  verdict: Verdict;
}

export interface EmailArg {
  title: string;
  body: string;
  mp: string;
}

export interface Brand {
  id: string;
  name: string;
  flag: string;
  origin: string;
  tier: string;
  price: string;
  rating: number;
  reviews: number;
  sustainability: boolean;
  contact: string;
  dna: string;
  categories: string[];
  scores: MarketplaceScore[];
  top_match: string;
  top_score: number;
  quick_win: string;
  strategy: string;
  subjectA: string;
  subjectB: string;
  email: string;
}

export interface Seller {
  id: string;
  name: string;
  flag: string;
  categories: string[];
  skus: number;
  price: number;
  rating: number;
  reviews: number;
  since: number;
  fulfillment: string;
  intl: boolean;
  brand: string;
  fit: number;
  verdict: Verdict;
  priority: "HIGH" | "MEDIUM" | "LOW";
  top_match: string;
  top_score: number;
  quick_win: string;
  breakdown: { label: string; score: number }[];
  args: EmailArg[];
  subjectA: string;
  subjectB: string;
  email: string;
}

export interface GeneratedResult {
  prospectId: string;
  mode: "c1" | "c2";
  data: Brand | Seller;
  generatedAt: string;
}
