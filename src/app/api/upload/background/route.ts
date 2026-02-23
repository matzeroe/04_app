import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import sharp from "sharp";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const buffer = await sharp(rawBuffer).rotate().toBuffer().catch(() => rawBuffer);

        // Speicherpfad für Hintergrund definieren
        const publicDir = join(process.cwd(), "public");

        // Stelle sicher dass public Ordner existiert
        if (!existsSync(publicDir)) {
            await mkdir(publicDir, { recursive: true });
        }

        // Immer als custom-bg auf dem Server ablegen
        // Wir nehmen die Original-Endung, um Flexibel für jpg/png zu sein.
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const filename = `custom-bg.${fileExtension}`;
        const filePath = join(publicDir, filename);

        await writeFile(filePath, buffer);

        // Zeitstempel anhängen, um Caching im Browser auszuhebeln
        const url = `/api/public/${filename}?t=${Date.now()}`;

        return NextResponse.json({ success: true, url: url });
    } catch (error) {
        console.error("Fehler beim Hintergrund-Upload:", error);
        return NextResponse.json({ error: "Hintergrund-Upload fehlgeschlagen." }, { status: 500 });
    }
}
