import type { Metadata } from "next";
import { Figtree, IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { SiteNavigation } from "@/components/site-navigation";
import { routing } from "@/i18n/routing";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-instrument-serif" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", variable: "--font-ibm-plex-mono" });

export const metadata: Metadata = { title: "Kokona Akatsu" };

// Apply a saved preference before the page paints. CSS provides the system default.
const initializeTheme = `try {
  const theme = localStorage.getItem("koko-theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = routing.defaultLocale;

  const t = await getTranslations("navigation");
  const labels = {
    primary: t("primary"),
    home: t("home"),
    menu: t("menu"),
    play: t("play"),
    about: t("about"),
    resume: t("resume"),
    theme: t("theme"),
    newYork: t("newYork"),
    tokyo: t("tokyo"),
  };

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${figtree.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: initializeTheme }} />
        <a className="skip-link" href="#main-content">{t("skip")}</a>
        <SiteNavigation locale={locale} labels={labels} />
        {children}
      </body>
    </html>
  );
}
