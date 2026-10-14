import type { Metadata } from "next";
import { Grenze_Gotisch, IM_Fell_English, IM_Fell_English_SC, Inter, Libre_Caslon_Text, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const grenze = Grenze_Gotisch({ variable: "--font-grenze", subsets: ["latin"] });
const fellSc = IM_Fell_English_SC({ variable: "--font-fellsc", subsets: ["latin"], weight: "400" });
const fell = IM_Fell_English({ variable: "--font-fell", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const techMono = Share_Tech_Mono({ variable: "--font-techmono", subsets: ["latin"], weight: "400" });
const caslon = Libre_Caslon_Text({ variable: "--font-caslon", subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Cerulean · Archives of the 41st Millennium", template: "%s · Cerulean" },
  description: "Lore archives for custom worlds of the Warhammer 40,000 universe.",
};

/**
 * SVG filters referenced from CSS: `roughen` wobbles ruled lines like a
 * dip pen; `ink` frays the edges of display lettering.
 */
function InkFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <filter id="roughen" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="ink" x="-5%" y="-10%" width="110%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="11" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fonts = [grenze, fellSc, fell, techMono, caslon, inter].map((f) => f.variable).join(" ");
  return (
    // Font variables live on <html> so theme tokens defined at :root can resolve them.
    <html lang="en" className={fonts}>
      <body className="antialiased">
        <InkFilters />
        {children}
      </body>
    </html>
  );
}
