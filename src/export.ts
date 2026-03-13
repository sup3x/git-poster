// src/export.ts
import fs from 'node:fs';
import path from 'node:path';

export function saveSvg(svg: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, svg, 'utf-8');
}

export async function savePng(svg: string, outputPath: string, scale = 2): Promise<void> {
  let sharp: typeof import('sharp');
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error(
      "PNG export requires the 'sharp' package. Install: npm i -g sharp"
    );
  }

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(svg, 'utf-8');
  await sharp(buffer, { density: 72 * scale })
    .png()
    .toFile(outputPath);
}
