import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import PwaManager from "@/components/PwaManager";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const viewport: Viewport = {
  themeColor: "#1A0F14",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "AUREVYN — The POS System for Africa",
  description: "Not an ERP. A POS that runs your whole business — sell, track stock, and see your cash, free for 30 days.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "AUREVYN", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "AUREVYN — The POS System for Africa",
    description: "Not an ERP. A POS that runs your whole business — sell, track stock, and see your cash, free for 30 days.",
    siteName: "Aurevyn",
    type: "website",
    // No `images` entry yet — add a real 1200x630 share image before
    // relying on link previews (WhatsApp/LinkedIn/Twitter all use this).
  },
  twitter: {
    card: "summary_large_image",
    title: "AUREVYN — The POS System for Africa",
    description: "Not an ERP. A POS that runs your whole business — sell, track stock, and see your cash, free for 30 days.",
    // site: "@yourhandle", — add once the account exists
  },
};

// Runs before first paint. Reads the cached theme (written by applyThemeColors /
// applyBuiltinTheme) so the saved theme shows instantly with no default-colors flash.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var m = location.pathname.match(/^\\/org\\/([^\\/]+)/);
    var cached = (m && localStorage.getItem("aurevyn-active-theme:" + m[1])) || localStorage.getItem("aurevyn-active-theme");
    if (!cached) return;
    var theme = JSON.parse(cached);
    var root = document.documentElement;
    if (theme.mode === "builtin") {
      root.setAttribute("data-theme", theme.name);
    } else if (theme.mode === "vars" && theme.vars) {
      for (var key in theme.vars) root.style.setProperty(key, theme.vars[key]);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable}`}
      >
        {children}
        <PwaManager />
      </body>
    </html>
  );
}