import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
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
        const buffer = await sharp(rawBuffer).rotate().toBuffer().catch(() => rawBuffer);

        // Wir speichern das Bild immer unter demselben Namen, damit es einfach überschrieben wird
        const uploadDir = join(process.cwd(), "public");
        const path = join(uploadDir, "slideshow-bg.jpg");

        await writeFile(path, buffer);
        console.log(`Slideshow-Hintergrund gespeichert unter ${path}`);

        return NextResponse.json({ success: true, url: "/api/public/slideshow-bg.jpg" });
    } catch (error) {
        console.error("Fehler beim Upload des Slideshow-Hintergrunds:", error);
        return NextResponse.json({ error: "Fehler beim Upload" }, { status: 500 });
    }
}
