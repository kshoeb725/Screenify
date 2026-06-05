// Client-side color extraction from an image data URL.
// Returns up to N dominant colors as hex and a coarse background style label.

export type Extracted = {
  palette: string[];
  backgroundStyle: string;
};

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export async function extractFromDataUrl(dataUrl: string, count = 5): Promise<Extracted> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = 80;
        const H = Math.max(1, Math.round((img.height / img.width) * W));
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ palette: [], backgroundStyle: "" });
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        // Bucket by quantized color
        const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
        let sumLum = 0;
        let pixelCount = 0;
        const edgeBuckets = new Map<string, number>();

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const r = data[i],
              g = data[i + 1],
              b = data[i + 2],
              a = data[i + 3];
            if (a < 200) continue;
            const qr = r >> 4,
              qg = g >> 4,
              qb = b >> 4;
            const key = `${qr},${qg},${qb}`;
            const cur = buckets.get(key);
            if (cur) {
              cur.r += r;
              cur.g += g;
              cur.b += b;
              cur.n++;
            } else {
              buckets.set(key, { r, g, b, n: 1 });
            }
            sumLum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
            pixelCount++;
            // Sample edge pixels for background estimate
            if (x < 2 || y < 2 || x > W - 3 || y > H - 3) {
              edgeBuckets.set(key, (edgeBuckets.get(key) ?? 0) + 1);
            }
          }
        }

        const sorted = [...buckets.entries()].sort((a, b) => b[1].n - a[1].n);
        const palette: string[] = [];
        for (const [, v] of sorted) {
          const hex = rgbToHex(Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n));
          if (!palette.includes(hex)) palette.push(hex);
          if (palette.length >= count) break;
        }

        // Background style heuristic
        const avgLum = pixelCount ? sumLum / pixelCount : 128;
        const tone = avgLum > 180 ? "light" : avgLum < 80 ? "dark" : "neutral";
        const edgeTop = [...edgeBuckets.entries()].sort((a, b) => b[1] - a[1])[0];
        const uniformity = edgeTop ? edgeTop[1] / Math.max(1, [...edgeBuckets.values()].reduce((a, b) => a + b, 0)) : 0;
        const surface = uniformity > 0.35 ? "solid flat" : "subtle gradient";
        const backgroundStyle = `${tone} ${surface}`;

        resolve({ palette, backgroundStyle });
      } catch {
        resolve({ palette: [], backgroundStyle: "" });
      }
    };
    img.onerror = () => resolve({ palette: [], backgroundStyle: "" });
    img.src = dataUrl;
  });
}
