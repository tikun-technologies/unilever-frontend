import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "FF⁴ · Fragrance Mixture Optimizer",
  description: "Fit · Feeling · Formulation · Fragrance",
};

export default function Ff4Layout({ children }: { children: ReactNode }) {
  return children;
}
