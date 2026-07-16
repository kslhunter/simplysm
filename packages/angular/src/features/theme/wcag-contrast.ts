// WCAG 2.x 대비율 계산 (DEC-012) — 테마(커스텀 테마 포함) 핵심 fg/bg 쌍 검증용.
// 알파 색은 배경 표면에 합성 후 계산한다.

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseCssColor(colorText: string): RgbaColor {
  const trimmed = colorText.trim().toLowerCase();

  if (trimmed === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (trimmed === "black") return { r: 0, g: 0, b: 0, a: 1 };
  if (trimmed === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(trimmed);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgbMatch =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(trimmed);
  if (rgbMatch) {
    // 알파 캡처 그룹은 미매치 시 런타임에 undefined (exec 타입은 string 으로 나옴)
    const alphaText = rgbMatch[4] as string | undefined;
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: alphaText != null ? Number(alphaText) : 1,
    };
  }

  throw new Error(`WCAG 대비 계산: 색상을 해석할 수 없습니다: "${colorText}"`);
}

function composite(fg: RgbaColor, bg: RgbaColor): RgbaColor {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function getRelativeLuminance(color: RgbaColor): number {
  const [r, g, b] = [color.r, color.g, color.b].map((v) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x 대비율 (1-21).
 *
 * @param foregroundColor 전경색(텍스트 등). 알파면 배경 위에 합성 후 계산.
 * @param backgroundColor 배경색. 알파면 `baseColor` 위에 합성(불투명 배경이면 불필요).
 * @param baseColor 반투명 배경 아래의 최종 불투명 표면색.
 */
export function getWcagContrastRatio(
  foregroundColor: string,
  backgroundColor: string,
  baseColor?: string,
): number {
  let bg = parseCssColor(backgroundColor);
  if (bg.a < 1) {
    if (baseColor == null) {
      throw new Error(
        `WCAG 대비 계산: 반투명 배경("${backgroundColor}")은 base 표면색이 필요합니다`,
      );
    }
    const base = parseCssColor(baseColor);
    if (base.a < 1) {
      throw new Error(`WCAG 대비 계산: base 표면색("${baseColor}")은 불투명해야 합니다`);
    }
    bg = composite(bg, base);
  }

  const fg = composite(parseCssColor(foregroundColor), bg);

  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
