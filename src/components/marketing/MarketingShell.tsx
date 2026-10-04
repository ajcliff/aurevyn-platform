import localFont from "next/font/local";
import "@/styles/marketing.css";
import AnnouncementBanner from "./AnnouncementBanner";

const plexSans = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mkt-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mkt-plex-mono",
  display: "swap",
});

export default function MarketingShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mkt-shell ${plexSans.variable} ${plexMono.variable} ${className}`}>
      <AnnouncementBanner />
      {children}
    </div>
  );
}