import { useTheme } from "next-themes";

const BRAND_BASE = "/branding/space-truck";

const assets = {
  logoWithSlogan: {
    dark: `${BRAND_BASE}/logo/space-truck-logo-principal-com-slogan-branco.png`,
    light: `${BRAND_BASE}/logo/space-truck-logo-principal-com-slogan-preto.png`,
  },
  wordmarkHorizontal: {
    dark: `${BRAND_BASE}/wordmark/space-truck-wordmark-horizontal-branco.png`,
    light: `${BRAND_BASE}/wordmark/space-truck-wordmark-horizontal-preto.png`,
  },
} as const;

type AssetKey = keyof typeof assets;

export function useBrandAsset(key: AssetKey): string {
  const { resolvedTheme } = useTheme();
  const variant = resolvedTheme === "light" ? "light" : "dark";
  return assets[key][variant];
}
