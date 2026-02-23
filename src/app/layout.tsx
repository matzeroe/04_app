import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unsere Hochzeit",
  description: "Teilt eure schönsten Momente mit uns - Foto Upload & Diashow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        {children}
      </body>
    </html>
  );
}
