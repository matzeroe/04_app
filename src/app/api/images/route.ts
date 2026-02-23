import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const uploadDir = join(process.cwd(), "public", "uploads");

        if (!existsSync(uploadDir)) {
            return NextResponse.json({ images: [] });
        }

        const files = await readdir(uploadDir);

        // Nur Bilder filtern und Metadaten abrufen
        const imageFiles = files.filter(file => {
            const ext = file.toLowerCase().split('.').pop();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
        });

        // Hole Erstellungsdatum für Sortierung (neueste zuerst)
        const imagesWithStats = await Promise.all(
            imageFiles.map(async (filename) => {
                const filePath = join(uploadDir, filename);
                const stats = await stat(filePath);
                return {
                    filename,
                    url: `/api/uploads/${filename}`,
                    createdAt: stats.birthtimeMs || stats.mtimeMs // fallback auf mtime
                };
            })
        );

        // Absteigend sortieren
        imagesWithStats.sort((a, b) => b.createdAt - a.createdAt);

        return NextResponse.json({ images: imagesWithStats });
    } catch (error) {
        console.error("Fehler beim Abrufen der Bilder:", error);
        return NextResponse.json({ error: "Konnte Bilder nicht laden." }, { status: 500 });
    }
}

import { unlink } from "fs/promises";

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: "Dateiname fehlt." }, { status: 400 });
        }

        // Sicherheit: Verhindern von Path Traversal Angriffen
        if (filename.includes('/') || filename.includes('..')) {
            return NextResponse.json({ error: "Ungültiger Dateiname." }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), "public", "uploads");
        const filePath = join(uploadDir, filename);

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
        }

        await unlink(filePath);
        return NextResponse.json({ success: true, message: "Bild erfolgreich gelöscht." });

    } catch (error) {
        console.error("Fehler beim Löschen des Bildes:", error);
        return NextResponse.json({ error: "Konnte Bild nicht löschen." }, { status: 500 });
    }
}
