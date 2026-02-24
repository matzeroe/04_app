import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const settingsPath = join(process.cwd(), "public", "settings.json");

export const dynamic = "force-dynamic";

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
                watermarkBorderRadius: 24,
                useWatermarkBgImage: false,
                useSlideshowBgImage: false,
                slideshowBgBlur: 20,
                useUploadPageBgImage: false,
                uploadBgBlur: 20,
                maxFileSizeMB: 5,
                imageFilter: "none",
                txtUploadTitle: "Teilt eure schönsten Momente unserer Hochzeit mit uns!",
                txtUploadButton: "Fotos auswählen",
                txtUploadButtonSub: "Tippen Sie hier, um beliebig viele Bilder hinzuzufügen",
                txtUploadSubmit: "Bild(er) hochladen",
                txtUploadSuccess: "Erfolgreich hochgeladen!",
                txtUploadSuccessSub: "Danke für eure Erinnerungen!",
                txtSlideshowLoginTitle: "Diashow Login",
                txtSlideshowLoginSub: "Bitte geben Sie das Passwort für die Diashow ein.",
                txtSlideshowEmpty: "Noch keine Bilder hochgeladen.",
                txtSlideshowEmptySub: "Scannt den Code und ladet das erste Foto hoch!"
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
        if (parsed.watermarkBorderRadius === undefined) parsed.watermarkBorderRadius = 24;
        if (parsed.useWatermarkBgImage === undefined) parsed.useWatermarkBgImage = false;
        if (parsed.useSlideshowBgImage === undefined) parsed.useSlideshowBgImage = false;
        if (parsed.slideshowBgBlur === undefined) parsed.slideshowBgBlur = 20;
        if (parsed.useUploadPageBgImage === undefined) parsed.useUploadPageBgImage = false;
        if (parsed.uploadBgBlur === undefined) parsed.uploadBgBlur = 20;
        if (parsed.maxFileSizeMB === undefined) parsed.maxFileSizeMB = 5;
        if (!parsed.imageFilter) parsed.imageFilter = "none";
        if (!parsed.txtUploadTitle) parsed.txtUploadTitle = "Teilt eure schönsten Momente unserer Hochzeit mit uns!";
        if (!parsed.txtUploadButton) parsed.txtUploadButton = "Fotos auswählen";
        if (!parsed.txtUploadButtonSub) parsed.txtUploadButtonSub = "Tippen Sie hier, um beliebig viele Bilder hinzuzufügen";
        if (!parsed.txtUploadSubmit) parsed.txtUploadSubmit = "Bild(er) hochladen";
        if (!parsed.txtUploadSuccess) parsed.txtUploadSuccess = "Erfolgreich hochgeladen!";
        if (!parsed.txtUploadSuccessSub) parsed.txtUploadSuccessSub = "Danke für eure Erinnerungen!";
        if (!parsed.txtSlideshowLoginTitle) parsed.txtSlideshowLoginTitle = "Diashow Login";
        if (!parsed.txtSlideshowLoginSub) parsed.txtSlideshowLoginSub = "Bitte geben Sie das Passwort für die Diashow ein.";
        if (!parsed.txtSlideshowEmpty) parsed.txtSlideshowEmpty = "Noch keine Bilder hochgeladen.";
        if (!parsed.txtSlideshowEmptySub) parsed.txtSlideshowEmptySub = "Scannt den Code und ladet das erste Foto hoch!";

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
            watermarkBorderRadius: 24,
            useWatermarkBgImage: false,
            useSlideshowBgImage: false,
            slideshowBgBlur: 20,
            useUploadPageBgImage: false,
            uploadBgBlur: 20,
            maxFileSizeMB: 5,
            imageFilter: "none",
            txtUploadTitle: "Teilt eure schönsten Momente unserer Hochzeit mit uns!",
            txtUploadButton: "Fotos auswählen",
            txtUploadButtonSub: "Tippen Sie hier, um beliebig viele Bilder hinzuzufügen",
            txtUploadSubmit: "Bild(er) hochladen",
            txtUploadSuccess: "Erfolgreich hochgeladen!",
            txtUploadSuccessSub: "Danke für eure Erinnerungen!",
            txtSlideshowLoginTitle: "Diashow Login",
            txtSlideshowLoginSub: "Bitte geben Sie das Passwort für die Diashow ein.",
            txtSlideshowEmpty: "Noch keine Bilder hochgeladen.",
            txtSlideshowEmptySub: "Scannt den Code und ladet das erste Foto hoch!",
            txtQrSlideTitle: "Macht mit!",
            txtQrSlideSub: "Scannt den Code, um Fotos hochzuladen!"
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
        const watermarkBorderRadius = typeof data.watermarkBorderRadius === 'number' ? data.watermarkBorderRadius : 24;
        const useWatermarkBgImage = data.useWatermarkBgImage === true;
        const useSlideshowBgImage = data.useSlideshowBgImage === true;
        const slideshowBgBlur = typeof data.slideshowBgBlur === 'number' ? data.slideshowBgBlur : 20;
        const useUploadPageBgImage = data.useUploadPageBgImage === true;
        const uploadBgBlur = typeof data.uploadBgBlur === 'number' ? data.uploadBgBlur : 20;
        const maxFileSizeMB = typeof data.maxFileSizeMB === 'number' ? Math.max(1, Math.min(100, data.maxFileSizeMB)) : 5;
        const imageFilter = ["none", "grayscale", "sepia"].includes(data.imageFilter) ? data.imageFilter : "none";
        const eventName = typeof data.eventName === 'string' ? data.eventName.trim() : "Ella & Matze";

        const txtUploadTitle = typeof data.txtUploadTitle === 'string' ? data.txtUploadTitle.trim() : "Teilt eure schönsten Momente unserer Hochzeit mit uns!";
        const txtUploadButton = typeof data.txtUploadButton === 'string' ? data.txtUploadButton.trim() : "Fotos auswählen";
        const txtUploadButtonSub = typeof data.txtUploadButtonSub === 'string' ? data.txtUploadButtonSub.trim() : "Tippen Sie hier, um beliebig viele Bilder hinzuzufügen";
        const txtUploadSubmit = typeof data.txtUploadSubmit === 'string' ? data.txtUploadSubmit.trim() : "Bild(er) hochladen";
        const txtUploadSuccess = typeof data.txtUploadSuccess === 'string' ? data.txtUploadSuccess.trim() : "Erfolgreich hochgeladen!";
        const txtUploadSuccessSub = typeof data.txtUploadSuccessSub === 'string' ? data.txtUploadSuccessSub.trim() : "Danke für eure Erinnerungen!";
        const txtSlideshowLoginTitle = typeof data.txtSlideshowLoginTitle === 'string' ? data.txtSlideshowLoginTitle.trim() : "Diashow Login";
        const txtSlideshowLoginSub = typeof data.txtSlideshowLoginSub === 'string' ? data.txtSlideshowLoginSub.trim() : "Bitte geben Sie das Passwort für die Diashow ein.";
        const txtSlideshowEmpty = typeof data.txtSlideshowEmpty === 'string' ? data.txtSlideshowEmpty.trim() : "Noch keine Bilder hochgeladen.";
        const txtSlideshowEmptySub = typeof data.txtSlideshowEmptySub === 'string' ? data.txtSlideshowEmptySub.trim() : "Scannt den Code und ladet das erste Foto hoch!";
        const txtQrSlideTitle = typeof data.txtQrSlideTitle === 'string' ? data.txtQrSlideTitle.trim() : "Macht mit!";
        const txtQrSlideSub = typeof data.txtQrSlideSub === 'string' ? data.txtQrSlideSub.trim() : "Scannt den Code, um Fotos hochzuladen!";

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
            watermarkBorderRadius: watermarkBorderRadius,
            useWatermarkBgImage: useWatermarkBgImage,
            useSlideshowBgImage: useSlideshowBgImage,
            slideshowBgBlur: slideshowBgBlur,
            useUploadPageBgImage: useUploadPageBgImage,
            uploadBgBlur: uploadBgBlur,
            maxFileSizeMB: maxFileSizeMB,
            imageFilter: imageFilter,
            txtUploadTitle: txtUploadTitle,
            txtUploadButton: txtUploadButton,
            txtUploadButtonSub: txtUploadButtonSub,
            txtUploadSubmit: txtUploadSubmit,
            txtUploadSuccess: txtUploadSuccess,
            txtUploadSuccessSub: txtUploadSuccessSub,
            txtSlideshowLoginTitle: txtSlideshowLoginTitle,
            txtSlideshowLoginSub: txtSlideshowLoginSub,
            txtSlideshowEmpty: txtSlideshowEmpty,
            txtSlideshowEmptySub: txtSlideshowEmptySub,
            txtQrSlideTitle: txtQrSlideTitle,
            txtQrSlideSub: txtQrSlideSub
        }));
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Fehler beim Speichern der Einstellungen:", error);
        return NextResponse.json({ error: "Konnte Einstellungen nicht speichern." }, { status: 500 });
    }
}
