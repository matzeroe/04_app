import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const settingsPath = join(process.cwd(), "public", "settings.json");

export async function GET() {
    try {
        if (!existsSync(settingsPath)) {
            // Standardwerte
            return NextResponse.json({
                slideshowInterval: 5000,
                newImageInterval: 5000,
                eventName: "Ella & Matze",
                watermarkEnabled: false,
                watermarkText: "02.05.2026\nElla & Matze",
                watermarkFontFamily: "Arial, Helvetica, sans-serif",
                watermarkFontSize: 0.025,
                watermarkFontWeight: "bold",
                watermarkColor: "#555555",
                watermarkFrameWidth: 20,
                watermarkFrameBottom: 80,
                useWatermarkBgImage: false,
                imageFilter: "none"
            });
        }

        const data = await readFile(settingsPath, 'utf8');
        const parsed = JSON.parse(data);
        // Fallback für alte configs
        if (!parsed.newImageInterval) parsed.newImageInterval = 5000;
        if (!parsed.eventName) parsed.eventName = "Ella & Matze";
        if (parsed.watermarkEnabled === undefined) parsed.watermarkEnabled = false;
        if (!parsed.watermarkText) parsed.watermarkText = "02.05.2026\nElla & Matze";
        if (!parsed.watermarkFontFamily) parsed.watermarkFontFamily = "Arial, Helvetica, sans-serif";
        if (parsed.watermarkFontSize === undefined) parsed.watermarkFontSize = 0.025;
        if (!parsed.watermarkFontWeight) parsed.watermarkFontWeight = "bold";
        if (!parsed.watermarkColor) parsed.watermarkColor = "#555555";
        if (parsed.watermarkFrameWidth === undefined) parsed.watermarkFrameWidth = 20;
        if (parsed.watermarkFrameBottom === undefined) parsed.watermarkFrameBottom = 80;
        if (parsed.useWatermarkBgImage === undefined) parsed.useWatermarkBgImage = false;
        if (!parsed.imageFilter) parsed.imageFilter = "none";

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Fehler beim Lesen der Einstellungen:", error);
        return NextResponse.json({
            slideshowInterval: 5000,
            newImageInterval: 5000,
            eventName: "Ella & Matze",
            watermarkEnabled: false,
            watermarkText: "02.05.2026\nElla & Matze",
            watermarkFontFamily: "Arial, Helvetica, sans-serif",
            watermarkFontSize: 0.025,
            watermarkFontWeight: "bold",
            watermarkColor: "#555555",
            watermarkFrameWidth: 20,
            watermarkFrameBottom: 80,
            useWatermarkBgImage: false,
            imageFilter: "none"
        }); // Fallback
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Validierung
        const interval = parseInt(data.slideshowInterval);
        const newInterval = parseInt(data.newImageInterval);

        if (isNaN(interval) || interval < 1000 || interval > 60000) {
            return NextResponse.json({ error: "Ungültiges Diashow-Intervall (1-60 Sekunden erlaubt)." }, { status: 400 });
        }
        if (isNaN(newInterval) || newInterval < 1000 || newInterval > 60000) {
            return NextResponse.json({ error: "Ungültiges Neu-Bild-Intervall (1-60 Sekunden erlaubt)." }, { status: 400 });
        }

        const watermarkEnabled = data.watermarkEnabled === true;
        const watermarkText = typeof data.watermarkText === 'string' ? data.watermarkText.trim() : "02.05.2026\nElla & Matze";
        const watermarkFontFamily = data.watermarkFontFamily || "Arial, Helvetica, sans-serif";
        const watermarkFontSize = typeof data.watermarkFontSize === 'number' ? data.watermarkFontSize : 0.025;
        const watermarkFontWeight = data.watermarkFontWeight || "bold";
        const watermarkColor = data.watermarkColor || "#555555";
        const watermarkFrameWidth = typeof data.watermarkFrameWidth === 'number' ? data.watermarkFrameWidth : 20;
        const watermarkFrameBottom = typeof data.watermarkFrameBottom === 'number' ? data.watermarkFrameBottom : 80;
        const useWatermarkBgImage = data.useWatermarkBgImage === true;
        const imageFilter = ["none", "grayscale", "sepia"].includes(data.imageFilter) ? data.imageFilter : "none";
        const eventName = typeof data.eventName === 'string' ? data.eventName.trim() : "Ella & Matze";

        await writeFile(settingsPath, JSON.stringify({
            slideshowInterval: interval,
            newImageInterval: newInterval,
            eventName: eventName,
            watermarkEnabled: watermarkEnabled,
            watermarkText: watermarkText,
            watermarkFontFamily: watermarkFontFamily,
            watermarkFontSize: watermarkFontSize,
            watermarkFontWeight: watermarkFontWeight,
            watermarkColor: watermarkColor,
            watermarkFrameWidth: watermarkFrameWidth,
            watermarkFrameBottom: watermarkFrameBottom,
            useWatermarkBgImage: useWatermarkBgImage,
            imageFilter: imageFilter
        }));
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Fehler beim Speichern der Einstellungen:", error);
        return NextResponse.json({ error: "Konnte Einstellungen nicht speichern." }, { status: 500 });
    }
}
