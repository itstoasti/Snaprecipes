import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Snap Recipes - Save Any Recipe Instantly",
    template: "%s | Snap Recipes",
  },
  description:
    "Snap a photo or paste a link. Snap Recipes extracts and organizes recipes from anywhere. Never lose a recipe again.",
  metadataBase: new URL("https://snaprecipes.xyz"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://snaprecipes.xyz",
    siteName: "Snap Recipes",
    title: "Snap Recipes - Save Any Recipe Instantly",
    description:
      "Snap a photo or paste a link. Snap Recipes extracts and organizes recipes from anywhere.",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Snap Recipes" }],
  },
  twitter: {
    card: "summary",
    title: "Snap Recipes - Save Any Recipe Instantly",
    description:
      "Snap a photo or paste a link. Snap Recipes extracts and organizes recipes from anywhere.",
  },
  keywords: ["recipes", "cooking", "save recipes", "recipe organizer", "no ads", "no life stories", "meal prep"],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.png",
  },
};

function GlobalSchema() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Snap Recipes",
    "url": "https://snaprecipes.xyz",
    "logo": "https://snaprecipes.xyz/icon.png",
    "sameAs": [
      "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Snap Recipes",
    "url": "https://snaprecipes.xyz",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://snaprecipes.xyz/recipes?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} font-sans bg-surface-950 text-white antialiased`}
      >
        <GlobalSchema />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-24WEG404F3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-24WEG404F3');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
