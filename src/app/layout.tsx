import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "AUREVYN",
  description: "The Business Operating System",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var cached = localStorage.getItem("aurevyn-active-theme");
    if (!cached) return;
    var theme = JSON.parse(cached);
    if (theme.mode === "builtin") {
      document.documentElement.setAttribute("data-theme", theme.name);
    } else if (theme.mode === "colors" && theme.colors) {
      for (var key in theme.colors) {
        document.documentElement.style.setProperty("--" + key.replace(/_/g, "-"), theme.colors[key]);
      }
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
      </body>
    </html>
  );
}