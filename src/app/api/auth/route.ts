import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { password, type } = await request.json();

        if (!password || !type) {
            return NextResponse.json({ error: "Passwort und Typ erforderlich" }, { status: 400 });
        }

        // Passwörter aus Umgebungsvariablen oder Fallback
        const slideshowPassword = process.env.SLIDESHOW_PASSWORD || "diashow2026";
        const adminPassword = process.env.ADMIN_PASSWORD || "brautpaar2026";
        const guestPassword = process.env.GUEST_PASSWORD || "elma";

        let isValid = false;

        if (type === "slideshow" && password === slideshowPassword) {
            isValid = true;
        } else if (type === "admin" && password === adminPassword) {
            isValid = true;
        } else if (type === "guest" && password === guestPassword) {
            isValid = true;
        }

        if (isValid) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Fehler bei der Überprüfung" }, { status: 500 });
    }
}
