import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Keine Datei gefunden." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Wir speichern das Bild immer unter demselben Namen, damit es einfach überschrieben wird
        const uploadDir = join(process.cwd(), "public");
        const path = join(uploadDir, "watermark-bg.jpg");

        await writeFile(path, buffer);
        console.log(`Wasserzeichen-Hintergrund gespeichert unter ${path}`);

        return NextResponse.json({ success: true, url: "/watermark-bg.jpg" });
    } catch (error) {
        console.error("Fehler beim Upload des Wasserzeichen-Hintergrunds:", error);
        return NextResponse.json({ error: "Fehler beim Upload" }, { status: 500 });
    }
}
