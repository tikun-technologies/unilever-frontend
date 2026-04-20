import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fragrance Map — UFH × MGA Mind Genomics Pilot",
  description: "Interactive 2D map of 15 fragrance stimuli across Feel and Fit dimensions",
};

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Fonts for the Fragrance Map */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
