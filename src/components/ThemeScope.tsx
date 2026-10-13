/* eslint-disable @next/next/no-img-element -- backdrop served from our own media route */
import { atmosphereBackground, normalizeTheme, themeVars } from "@/lib/theme";
import { publicUrl } from "@/lib/storage";

type Props = {
  theme: unknown;
  backdrop?: { key: string } | null;
  children: React.ReactNode;
};

/**
 * Applies a star system's theme to everything inside it: overrides the colour
 * variables and lays the backdrop image and atmosphere wash behind the page.
 */
export function ThemeScope({ theme: raw, backdrop, children }: Props) {
  const theme = normalizeTheme(raw);
  const wash = atmosphereBackground(theme);
  return (
    <div style={themeVars(theme) as React.CSSProperties} data-theme-preset={theme.preset}>
      {(backdrop || wash) && (
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
          {backdrop && theme.backdropOpacity > 0 && (
            <img
              src={publicUrl(backdrop.key)}
              alt=""
              className="grim-image h-full w-full object-cover"
              style={{ opacity: theme.backdropOpacity / 100 }}
            />
          )}
          {wash && <div className="absolute inset-0 mix-blend-screen" style={{ background: wash }} />}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.75)_100%)]" />
        </div>
      )}
      {children}
    </div>
  );
}
