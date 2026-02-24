import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Keine Datei gefunden." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const rawBuffer = Buffer.from(bytes);

        // EXIF-Daten auslesen und Bild entsprechend rotieren
        // .rotate() ohne Argumente nutzt die EXIF Orientation und dreht die Pixel physisch richtig hin
        const buffer = await sharp(rawBuffer).rotate().toBuffer().catch((err) => {
            console.warn("EXIF-Rotation fehlgeschlagen, speichere unmodifiziert:", err);
            return rawBuffer;
        });

        // Backup-Verzeichnis für Originalbilder erstellen und Bild dort als erstes speichern
        const uploadDir = join(process.cwd(), "public", "uploads");
        const originalsDir = join(uploadDir, "originals");
        if (!existsSync(originalsDir)) {
            await mkdir(originalsDir, { recursive: true });
        }

        // Sicherer, eindeutiger Dateiname (Basis)
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const originalExtension = file.name.split('.').pop() || 'jpg';
        const originalFilename = `wedding-${uniqueSuffix}.${originalExtension}`;
        const originalPath = join(originalsDir, originalFilename);

        await writeFile(originalPath, buffer);
        console.log(`Originaldatei als Backup gespeichert unter ${originalPath}`);

        // Einstellungen laden
        let watermarkEnabled = false;
        let watermarkText = "02.05.2026\nElla & Matze";
        let watermarkFontFamily = "Arial, Helvetica, sans-serif";
        let watermarkFontSize = 0.025;
        let watermarkFontWeight = "bold";
        let watermarkColor = "#555555";
        let watermarkFrameWidth = 20;
        let watermarkFrameBottom = 80;
        let watermarkBorderRadius = 24;
        let useWatermarkBgImage = false;
        let imageFilter = "none";
        const settingsPath = join(process.cwd(), "public", "settings.json");
        try {
            if (existsSync(settingsPath)) {
                const settingsData = await readFile(settingsPath, 'utf8');
                const parsed = JSON.parse(settingsData);
                if (parsed.watermarkEnabled === true) watermarkEnabled = true;
                if (parsed.watermarkText) watermarkText = parsed.watermarkText;
                if (parsed.watermarkFontFamily) watermarkFontFamily = parsed.watermarkFontFamily;
                if (parsed.watermarkFontSize !== undefined) watermarkFontSize = parsed.watermarkFontSize;
                if (parsed.watermarkFontWeight) watermarkFontWeight = parsed.watermarkFontWeight;
                if (parsed.watermarkColor) watermarkColor = parsed.watermarkColor;
                if (parsed.watermarkFrameWidth !== undefined) watermarkFrameWidth = parsed.watermarkFrameWidth;
                if (parsed.watermarkFrameBottom !== undefined) watermarkFrameBottom = parsed.watermarkFrameBottom;
                if (parsed.watermarkBorderRadius !== undefined) watermarkBorderRadius = parsed.watermarkBorderRadius;
                if (parsed.useWatermarkBgImage === true) useWatermarkBgImage = true;
                if (parsed.imageFilter) imageFilter = parsed.imageFilter;
            }
        } catch (e) {
            console.error("Konnte Einstellungen nicht laden, ignoriere Wasserzeichen:", e);
        }

        const needsProcessing = watermarkEnabled || imageFilter !== "none";

        // Wenn Rahmen aktiviert, als PNG speichern für transparente Ecken
        const finalExtension = watermarkEnabled ? 'png' : originalExtension;
        const filename = `wedding-${uniqueSuffix}.${finalExtension}`;
        const path = join(uploadDir, filename);

        // Ordner erstellen, falls er nicht existiert
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        if (!needsProcessing) {
            // Ohne Wasserzeichen und Filter speichern
            await writeFile(path, buffer);
            console.log(`Datei gespeichert unter ${path} (Original)`);
            return NextResponse.json({ success: true, filename, url: `/api/uploads/${filename}` });
        }

        // Bild verarbeiten (Filter und/oder Wasserzeichen)
        try {
            let image = sharp(buffer);

            // 1. Bild-Filter anwenden
            if (imageFilter === "grayscale") {
                image = image.grayscale();
            } else if (imageFilter === "sepia") {
                image = image.recomb([
                    [0.393, 0.769, 0.189],
                    [0.349, 0.686, 0.168],
                    [0.272, 0.534, 0.131]
                ]);
            }

            if (watermarkEnabled && watermarkText) {
                const metadata = await image.metadata();

                const imgWidth = metadata.width || 800;
                const imgHeight = metadata.height || 600;

                // Dynamische SVG-Font-Size relativ zur Bildbreite und Config
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

                // SVG Maske für abgerundete Ecken (wie in der Diashow)
                const roundedCornersSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${frameW}" height="${frameH}" viewBox="0 0 ${frameW} ${frameH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${frameW}" height="${frameH}" rx="${watermarkBorderRadius}" ry="${watermarkBorderRadius}" fill="#ffffff"/>
</svg>`);

                // Verarbeiten und Speichern
                const bgImagePath = join(process.cwd(), "public", "watermark-bg.jpg");
                const hasBgImage = useWatermarkBgImage && existsSync(bgImagePath);

                if (hasBgImage) {
                    // 1. Hintergrundbild laden und auf frameW x frameH skalieren
                    const bgBuffer = await sharp(bgImagePath)
                        .resize(frameW, frameH, { fit: 'cover' })
                        .toBuffer();

                    // 2. Das originale Bild auf den Hintergrund composen, danach das Text-SVG
                    const originalImageBuffer = await image.toBuffer();
                    await sharp(bgBuffer)
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
                            {
                                input: roundedCornersSvg,
                                blend: 'dest-in'
                            }
                        ])
                        .png()
                        .toFile(path);
                } else {
                    // Fallback: Weißer Rahmen
                    await image
                        // 1. Zuerst den weißen Hintergrund/Rahmen hinzufügen
                        .extend({
                            top: watermarkFrameWidth,
                            bottom: watermarkFrameBottom,
                            left: watermarkFrameWidth,
                            right: watermarkFrameWidth,
                            background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent padding!
                        })
                        // 2. Zeichne das weiße Rechteck in der Größe des Rahmens mit border-radius, UND dann das Text SVG
                        .composite([
                            {
                                // Weißer Hintergrund (mit abgerundeten Ecken!)
                                input: roundedCornersSvg,
                                blend: 'dest-over' // Hinter das Hauptbild legen
                            },
                            {
                                input: Buffer.from(svgOverlay),
                                top: 0,
                                left: 0,
                            }
                        ])
                        .png()
                        .toFile(path);
                }
            } else {
                // Nur Filter anwenden
                await image.toFile(path);
            }

        } catch (sharpError) {
            console.warn("Fehler bei der Bildverarbeitung, speichere ohne Wasserzeichen:", sharpError);
            // Fallback für den seltenen Fall, dass sharp abstürzt oder das Bildformat ungültig ist
            await writeFile(path, buffer);
        }

        console.log(`Datei gespeichert unter ${path}`);

        return NextResponse.json({ success: true, filename, url: `/api/uploads/${filename}` });
    } catch (error) {
        console.error("Fehler beim Upload:", error);
        return NextResponse.json({ error: "Fehler beim Upload der Datei." }, { status: 500 });
    }
}
