import sharp from "sharp";
import { promises as fs } from "fs";

async function test() {
    try {
        // Erzeuge ein leeres Bild
        const imgWidth = 800;
        const imgHeight = 600;
        const fontSize = 40;
        const watermarkText = "12345 | Test & Test";

        const escapedText = watermarkText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const svgOverlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${imgWidth}" height="${imgHeight}" viewBox="0 0 ${imgWidth} ${imgHeight}" xmlns="http://www.w3.org/2000/svg">
<text x="${imgWidth - Math.floor(fontSize * 0.5)}" y="${imgHeight - Math.floor(fontSize * 1.5)}" text-anchor="end" fill="rgba(0,0,0,0.6)" font-size="${fontSize}px" font-family="Arial, Helvetica, sans-serif" font-weight="bold">${escapedText}</text>
<text x="${imgWidth - Math.floor(fontSize * 0.5) - 2}" y="${imgHeight - Math.floor(fontSize * 1.5) - 2}" text-anchor="end" fill="rgba(255,255,255,0.8)" font-size="${fontSize}px" font-family="Arial, Helvetica, sans-serif" font-weight="bold">${escapedText}</text>
</svg>`;

        console.log("SVG:", svgOverlay);

        const imgBuffer = await sharp({
            create: {
                width: imgWidth,
                height: imgHeight,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 1 }
            }
        })
            .composite([
                {
                    input: Buffer.from(svgOverlay),
                    top: 0,
                    left: 0,
                },
            ])
            .png()
            .toBuffer();

        await fs.writeFile("test-watermark.png", imgBuffer);
        console.log("Success! File written to test-watermark.png");
    } catch (e) {
        console.error("Fehler:", e);
    }
}

test();
