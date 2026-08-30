import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/marketing.css";
import AnnouncementBanner from "./AnnouncementBanner";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mkt-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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