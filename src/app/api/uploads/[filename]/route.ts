import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ filename: string }> }
) {
    try {
        const params = await context.params;
        const filename = params.filename;

        if (!filename) {
            return new NextResponse("Filename required", { status: 400 });
        }

        // Security: Prevent directory traversal
        if (filename.includes('/') || filename.includes('..')) {
            return new NextResponse("Invalid filename", { status: 400 });
        }

        const filePath = join(process.cwd(), "public", "uploads", filename);

        if (!existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "png") contentType = "image/png";
        else if (ext === "gif") contentType = "image/gif";
        else if (ext === "webp") contentType = "image/webp";
        else if (ext === "svg") contentType = "image/svg+xml";

        // Set cache headers to cache the images in the browser
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
