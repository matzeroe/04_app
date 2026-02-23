import { NextResponse } from "next/server";
import { join } from "path";
import { existsSync, promises as fsPromises } from "fs";
import sharp from "sharp";

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { filename, rotation } = data;

        if (!filename || typeof rotation !== "number") {
            return NextResponse.json({ error: "Fehlende Parameter." }, { status: 400 });
        }

        // Sicherheit: Verhindern von Path Traversal Angriffen
        if (filename.includes('/') || filename.includes('..')) {
            return NextResponse.json({ error: "Ungültiger Dateiname." }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), "public", "uploads");
        const filePath = join(uploadDir, filename);
        const originalsDir = join(uploadDir, "originals");
        const originalFilePath = join(originalsDir, filename);

        let sourceFilePath = filePath;
        if (existsSync(originalFilePath)) {
            sourceFilePath = originalFilePath;
        } else if (!existsSync(filePath)) {
            return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
        }

        // Bild rotieren mit sharp
        const buffer = await fsPromises.readFile(sourceFilePath);
        let processedImage = sharp(buffer).rotate(rotation);

        // Wir speichern das neu gedrehte Bild als "neues" Originalbild ab
        const rotatedOriginalBuffer = await processedImage.toBuffer();
        if (!existsSync(originalsDir)) {
            await fsPromises.mkdir(originalsDir, { recursive: true });
        }
        await fsPromises.writeFile(originalFilePath, rotatedOriginalBuffer);

        // Für die weiteren Schritte (Wasserzeichen, Filter) arbeiten wir jetzt mit dem frisch gedrehten Original
        processedImage = sharp(rotatedOriginalBuffer);

        // Einstellungen laden
        let watermarkEnabled = false;
        let watermarkText = "02.05.2026\nElla & Matze";
        let watermarkFontFamily = "Arial, Helvetica, sans-serif";
        let watermarkFontSize = 0.025;
        let watermarkFontWeight = "bold";
        let watermarkColor = "#555555";
        let watermarkFrameWidth = 20;
        let watermarkFrameBottom = 80;
        let useWatermarkBgImage = false;
        let imageFilter = "none";
        const settingsPath = join(process.cwd(), "public", "settings.json");
        try {
            if (existsSync(settingsPath)) {
                const settingsData = await fsPromises.readFile(settingsPath, 'utf8');
                const parsed = JSON.parse(settingsData);
                if (parsed.watermarkEnabled === true) watermarkEnabled = true;
                if (parsed.watermarkText) watermarkText = parsed.watermarkText;
                if (parsed.watermarkFontFamily) watermarkFontFamily = parsed.watermarkFontFamily;
                if (parsed.watermarkFontSize !== undefined) watermarkFontSize = parsed.watermarkFontSize;
                if (parsed.watermarkFontWeight) watermarkFontWeight = parsed.watermarkFontWeight;
                if (parsed.watermarkColor) watermarkColor = parsed.watermarkColor;
                if (parsed.watermarkFrameWidth !== undefined) watermarkFrameWidth = parsed.watermarkFrameWidth;
                if (parsed.watermarkFrameBottom !== undefined) watermarkFrameBottom = parsed.watermarkFrameBottom;
                if (parsed.useWatermarkBgImage === true) useWatermarkBgImage = true;
                if (parsed.imageFilter) imageFilter = parsed.imageFilter;
            }
        } catch (e) {
            console.error("Konnte Einstellungen nicht laden, ignoriere Wasserzeichen:", e);
        }

        const needsProcessing = watermarkEnabled || imageFilter !== "none";

        if (!needsProcessing) {
            // Nur Drehen!
            const finalBuffer = await processedImage.toBuffer();
            await fsPromises.writeFile(filePath, finalBuffer);
            return NextResponse.json({ success: true, message: "Bild erfolgreich gedreht." });
        }

        // Bild verarbeiten (Filter und/oder Wasserzeichen) nach der Drehung
        try {
            const rotatedBuffer = await processedImage.toBuffer();
            processedImage = sharp(rotatedBuffer);

            // 1. Bild-Filter anwenden
            if (imageFilter === "grayscale") {
                processedImage = processedImage.grayscale();
            } else if (imageFilter === "sepia") {
                processedImage = processedImage.recomb([
                    [0.393, 0.769, 0.189],
                    [0.349, 0.686, 0.168],
                    [0.272, 0.534, 0.131]
                ]);
            }

            if (watermarkEnabled && watermarkText) {
                let finalBuffer: Buffer;
                const metadata = await processedImage.metadata();
                const imgWidth = metadata.width || 800;
                const imgHeight = metadata.height || 600;

                // Dynamische SVG-Font-Size relativ zur Bildbreite
                const fontSize = Math.max(16, Math.floor(imgWidth * watermarkFontSize));

                // Text in Zeilen aufteilen und escapen
                const lines = watermarkText.split('\n').map(line =>
                    line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                );

                // Um Fehler in sharp + librsvg im Text-Rendering zu umgehen, nutzen wir exakt formatiertes SVG mit ViewBox
                // Rahmen-Dimensionen für SVG-Canvas
                const frameW = imgWidth + (watermarkFrameWidth * 2);
                const frameH = imgHeight + watermarkFrameWidth + watermarkFrameBottom;

                // SVG aufbauen – jede Zeile wird als separates <text>-Tag generiert
                const lineHeight = fontSize * 1.2;
                const totalTextHeight = lines.length * lineHeight;

                // X ist absolut zentriert im gesamten Rahmen
                const centerX = Math.floor(frameW / 2);
                // Y startet vertikal zentriert innerhalb des unteren Rahmenteils
                // Der untere Rahmenteil beginnt bei (imgHeight + watermarkFrameWidth)
                const bottomAreaStart = imgHeight + watermarkFrameWidth;
                const startY = bottomAreaStart + (watermarkFrameBottom / 2) - (totalTextHeight / 2) + (fontSize * 0.8);

                let mainTexts = "";

                lines.forEach((line, index) => {
                    const yPos = startY + (index * lineHeight);
                    mainTexts += `<text x="${centerX}" y="${yPos}" text-anchor="middle" fill="${watermarkColor}" font-size="${fontSize}px" font-family="${watermarkFontFamily}" font-weight="${watermarkFontWeight}">${line}</text>\n`;
                });

                const svgOverlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${frameW}" height="${frameH}" viewBox="0 0 ${frameW} ${frameH}" xmlns="http://www.w3.org/2000/svg">
${mainTexts}
</svg>`;

                // Verarbeiten und Speichern
                const bgImagePath = join(process.cwd(), "public", "watermark-bg.jpg");
                const hasBgImage = useWatermarkBgImage && existsSync(bgImagePath);

                if (hasBgImage) {
                    // 1. Hintergrundbild laden und auf frameW x frameH skalieren
                    const bgBuffer = await sharp(bgImagePath)
                        .resize(frameW, frameH, { fit: 'cover' })
                        .toBuffer();

                    // 2. Das originale gedrehte Bild auf den Hintergrund composen, danach das Text-SVG
                    const originalImageBuffer = await processedImage.toBuffer();
                    finalBuffer = await sharp(bgBuffer)
                        .composite([
                            {
                                input: originalImageBuffer,
                                top: watermarkFrameWidth,
                                left: watermarkFrameWidth,
                            },
                            {
                                input: Buffer.from(svgOverlay),
                                top: 0,
                                left: 0,
                            },
                        ])
                        .toBuffer();
                } else {
                    finalBuffer = await processedImage
                        .extend({
                            top: watermarkFrameWidth,
                            bottom: watermarkFrameBottom,
                            left: watermarkFrameWidth,
                            right: watermarkFrameWidth,
                            background: { r: 255, g: 255, b: 255, alpha: 1 }
                        })
                        .composite([
                            {
                                input: Buffer.from(svgOverlay),
                                top: 0,
                                left: 0,
                            },
                        ]).toBuffer();
                }
                await fsPromises.writeFile(filePath, finalBuffer);
            } else {
                const finalBuffer = await processedImage.toBuffer();
                await fsPromises.writeFile(filePath, finalBuffer);
            }

        } catch (sharpError) {
            console.warn("Fehler bei der Wasserzeichen-Erstellung, render nur Drehung:", sharpError);
            // Fallback für den seltenen Fall, dass sharp beim Overlay abstürzt
            const rotatedBuffer = await sharp(buffer).rotate(rotation).toBuffer();
            await fsPromises.writeFile(filePath, rotatedBuffer);
        }

        return NextResponse.json({ success: true, message: "Bild erfolgreich gedreht." });

    } catch (error) {
        console.error("Fehler beim Drehen des Bildes:", error);
        return NextResponse.json({ error: "Konnte Bild nicht drehen." }, { status: 500 });
    }
}
