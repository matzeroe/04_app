"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Play, Image as ImageIcon, Maximize, Minimize } from "lucide-react";
import QRCode from "react-qr-code";

export default function Slideshow() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [intervalTime, setIntervalTime] = useState(5000); // Standard: 5 Sekunden
    const [newImageInterval, setNewImageInterval] = useState(5000); // Standard: 5 Sekunden für neue Bilder
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Inaktivitäts-Status für Controls
    const [isControlsVisible, setIsControlsVisible] = useState(true);

    // Queue System für neue Fotos
    const [newImagesQueue, setNewImagesQueue] = useState<string[]>([]);
    const [isShowingNew, setIsShowingNew] = useState(false);
    const [useSlideshowBgImage, setUseSlideshowBgImage] = useState(false);
    const [slideshowBgBlur, setSlideshowBgBlur] = useState<number>(20);

    const containerRef = useRef<HTMLDivElement>(null);

    // Local Storage Check auf initialem Mount
    useEffect(() => {
        const storedAuth = localStorage.getItem("slideshowAuth");
        if (storedAuth === "true") {
            setIsAuthenticated(true);
            fetchImagesAndSettings();
        }
    }, []);

    // Fullscreen & Mouse Activity Event Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        let mouseTimeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            setIsControlsVisible(true);
            clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => {
                setIsControlsVisible(false);
            }, 3000); // nach 3 Sek Inaktivität ausblenden
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        window.addEventListener("mousemove", handleMouseMove);

        // Initialer Trigger
        handleMouseMove();

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(mouseTimeout);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error("Fehler beim Wechsel in den Vollbildmodus:", err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.error("Fehler beim Beenden des Vollbildmodus:", err);
            });
        }
    };

    // Authentifizierung
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, type: "slideshow" })
            });

            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem("slideshowAuth", "true");
                fetchImagesAndSettings();
            } else {
                setError("Falsches Passwort");
            }
        } catch (err) {
            setError("Verbindungsfehler");
        }
    };

    // Bilder und Settings laden
    const fetchImagesAndSettings = async () => {
        try {
            // Parallel Bilder und Settings laden
            const [imgRes, settingsRes] = await Promise.all([
                fetch("/api/images"),
                fetch("/api/settings")
            ]);

            if (imgRes.ok) {
                const data = await imgRes.json();

                setImages((prev: any[]) => {
                    if (prev.length > 0) {
                        const oldUrls = new Set(prev.map(i => i.url));
                        // Finde alle neuen Bilder, behalte nur die URLs
                        const newOnes = data.images
                            .filter((i: any) => !oldUrls.has(i.url))
                            .map((i: any) => i.url);

                        if (newOnes.length > 0) {
                            // Füge neue Bilder der Queue hinzu
                            setNewImagesQueue(q => [...q, ...newOnes]);
                        }
                    }
                    return data.images;
                });
            }

            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                if (settings.slideshowInterval) {
                    setIntervalTime(settings.slideshowInterval);
                }
                if (settings.newImageInterval) {
                    setNewImageInterval(settings.newImageInterval);
                }
                if (settings.useSlideshowBgImage !== undefined) {
                    setUseSlideshowBgImage(settings.useSlideshowBgImage);
                }
                if (settings.slideshowBgBlur !== undefined) {
                    setSlideshowBgBlur(settings.slideshowBgBlur);
                }
            }
        } catch (err) {
            console.error("Fehler beim Laden");
        } finally {
            setIsLoading(false);
        }
    };

    // Polling für neue Bilder alle 10 Sekunden
    useEffect(() => {
        if (!isAuthenticated) return;

        // Initialer Call in Login wird schon ausgeführt, deshalb nur Intervall
        const interval = setInterval(() => {
            fetchImagesAndSettings();
        }, 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Diashow Timer Logik
    useEffect(() => {
        if (!isAuthenticated || images.length === 0) return;

        // Welches Intervall nutzen wir?
        // Wenn Dinge in der Queue stehen, wird zuerst die Queue abgearbeitet.
        // Das isShowingNew Flag sorgt dafür, dass sofort geswitcht wird,
        // falls ein neues Bild reinkommt, während ein normales läuft.

        const hasItemsInQueue = newImagesQueue.length > 0;

        let timeoutId: NodeJS.Timeout;

        if (hasItemsInQueue) {
            // Queue-Modus
            if (!isShowingNew) {
                // Initialer Switch zur Queue
                setIsShowingNew(true);
                const nextUrl = newImagesQueue[0];
                const nextIdx = images.findIndex((img) => img.url === nextUrl);
                if (nextIdx !== -1) {
                    setCurrentIndex(nextIdx);
                }
            }

            timeoutId = setTimeout(() => {
                // Bild wurde jetzt 'newImageInterval' lang angezeigt, also aus der Queue werfen
                setNewImagesQueue(prev => prev.slice(1));

                if (newImagesQueue.length > 1) {
                    // Zeige nächstes Bild der Queue
                    const nextUrl = newImagesQueue[1];
                    const nextIdx = images.findIndex((img) => img.url === nextUrl);
                    if (nextIdx !== -1) {
                        setCurrentIndex(nextIdx);
                    }
                } else {
                    // Queue ist danach leer, beende Queue-Modus
                    setIsShowingNew(false);
                    setCurrentIndex((prev) => (prev + 1) % images.length);
                }
            }, newImageInterval);

        } else {
            // Normaler Modus
            if (isShowingNew) setIsShowingNew(false);

            timeoutId = setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, intervalTime);
        }

        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, images, intervalTime, newImageInterval, currentIndex, newImagesQueue, isShowingNew]);


    if (!isAuthenticated) {
        return (
            <main style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
            }}>
                <div className="glass-panel animate-fade-up" style={{
                    maxWidth: "400px",
                    width: "100%",
                    padding: "40px",
                    textAlign: "center"
                }}>
                    <div style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "rgba(212, 175, 55, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px"
                    }}>
                        <Lock size={28} style={{ color: "var(--color-primary)" }} />
                    </div>
                    <h2 style={{ marginBottom: "20px" }}>Bilderrahmen Login</h2>
                    <p style={{ color: "var(--color-text-light)", marginBottom: "30px", fontSize: "0.95rem" }}>
                        Bitte geben Sie das Passwort für die Diashow ein.
                    </p>

                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Passwort"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: "20px" }}
                        />
                        {error && <p style={{ color: "var(--color-error)", marginBottom: "16px" }}>{error}</p>}

                        <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                            <Play size={18} style={{ marginRight: "8px" }} /> Diashow starten
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", justifyContent: "center", background: "#000" }}>
                <div className="animate-spin" style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid rgba(212, 175, 55, 0.2)",
                    borderTopColor: "var(--color-primary)",
                    borderRadius: "50%"
                }}></div>
                <p style={{ color: "var(--color-text-light)", letterSpacing: "2px", textTransform: "uppercase", fontSize: "0.8rem" }}>Lade Momente...</p>
            </main>
        );
    }

    if (images.length === 0) {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    background: "#000",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                {/* Custom Hintergrund (Blurred) */}
                {useSlideshowBgImage && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 0,
                        overflow: "hidden"
                    }}>
                        <img
                            src={`/api/public/slideshow-bg.jpg?t=${Date.now()}`}
                            alt="Background"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                filter: `blur(${slideshowBgBlur}px)`,
                                transform: `scale(${1 + (slideshowBgBlur * 0.01)})`,
                                opacity: 0.4
                            }}
                        />
                    </div>
                )}

                <div
                    className="glass-panel animate-fade-up"
                    style={{
                        textAlign: "center",
                        zIndex: 10,
                        padding: "40px",
                        maxWidth: "600px"
                    }}
                >
                    <p style={{ color: "var(--color-text-light)", marginBottom: "20px", fontSize: "1.2rem" }}>Noch keine Bilder hochgeladen.</p>
                    <h2 style={{ fontSize: "2.5rem", color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                        {typeof window !== "undefined" ? window.location.origin : ""}
                    </h2>
                    <p style={{ color: "var(--color-primary)", marginTop: "20px", fontSize: "1.2rem" }}>Ladet das erste Foto hoch!</p>
                </div>
            </main>
        );
    }

    const currentImage = images[currentIndex];

    return (
        <main
            ref={containerRef}
            style={{
                minHeight: "100vh",
                background: "#000",
                position: "relative",
                overflow: "hidden"
            }}
        >

            {/* Custom Hintergrund (Blurred) */}
            {useSlideshowBgImage && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    overflow: "hidden"
                }}>
                    <img
                        src={`/api/public/slideshow-bg.jpg?t=${Date.now()}`}
                        alt="Background"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter: `blur(${slideshowBgBlur}px)`,
                            transform: `scale(${1 + (slideshowBgBlur * 0.01)})`, // Scaliert je nach blur-level dynamisch mit um Ränder zu verstecken
                            opacity: 0.4
                        }}
                    />
                </div>
            )}


            {/* Container für die Bilder (übereinander gelegt für sanften Übergang) */}
            {images.map((img, index) => {
                const isCurrent = index === currentIndex;
                const isPrev = !isShowingNew && images.length > 2 && index === (currentIndex - 1 + images.length) % images.length;
                const isNext = !isShowingNew && images.length > 1 && index === (currentIndex + 1) % images.length;

                const diff = (index - currentIndex + images.length) % images.length;
                const isRightSide = diff > 0 && diff <= images.length / 2;

                let opacity = 0;
                let transform = "translateX(0) scale(1)";
                let zIndex = 0;
                let filterStr = "drop-shadow(0 20px 40px rgba(0,0,0,0.5))";

                if (isCurrent) {
                    opacity = 1;
                    transform = "translateX(0) scale(1)";
                    zIndex = 10;
                } else if (isPrev) {
                    opacity = 0.4;
                    transform = "translateX(-32vw) scale(0.4)";
                    zIndex = 5;
                    filterStr = "drop-shadow(0 10px 20px rgba(0,0,0,0.5)) blur(4px)";
                } else if (isNext) {
                    opacity = 0.4;
                    transform = "translateX(32vw) scale(0.4)";
                    zIndex = 5;
                    filterStr = "drop-shadow(0 10px 20px rgba(0,0,0,0.5)) blur(4px)";
                } else {
                    opacity = 0;
                    transform = isRightSide ? "translateX(100vw) scale(0.2)" : "translateX(-100vw) scale(0.2)";
                    zIndex = 1;
                    filterStr = "drop-shadow(0 0px 0px rgba(0,0,0,0)) blur(8px)";
                }

                return (
                    <div
                        key={img.url}
                        style={{
                            position: "absolute",
                            inset: 0,
                            opacity: opacity,
                            transition: isShowingNew && isCurrent ? "none" : "all 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
                            zIndex: zIndex,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "40px",
                            transform: transform,
                            filter: filterStr
                        }}
                    >
                        <img
                            src={img.url}
                            alt="Hochzeitsfoto"
                            className={isShowingNew && isCurrent ? "fall-down-animation" : ""}
                            style={{
                                maxHeight: "100%",
                                maxWidth: "100%",
                                objectFit: "contain",
                                borderRadius: "12px"
                            }}
                        />
                    </div>
                );
            })}

            {/* QR-Code Block unten links */}
            {currentImage && (
                <div style={{
                    position: "absolute",
                    bottom: "30px",
                    left: "40px",
                    zIndex: 10,
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "12px",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    textAlign: "center"
                }}>
                    <QRCode
                        value={typeof window !== "undefined" ? `${window.location.origin}${currentImage.url}` : ""}
                        size={80}
                        style={{ display: "block" }}
                    />
                </div>
            )}

            {/* Fullscreen Toggle */}
            <button
                onClick={toggleFullscreen}
                style={{
                    position: "absolute",
                    top: "30px",
                    right: "40px",
                    zIndex: 20,
                    background: "rgba(0,0,0,0.5)",
                    border: "none",
                    color: "rgba(255,255,255,0.7)",
                    borderRadius: "50%",
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "all 0.3s ease",
                    opacity: isControlsVisible ? 1 : 0,
                    pointerEvents: isControlsVisible ? "auto" : "none"
                }}
                className="hover-opacity"
                title={isFullscreen ? "Vollbild beenden" : "Vollbild starten"}
            >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fallDownFlashing {
                    0% { transform: translateY(-120vh) scale(0.8) rotate(-10deg); opacity: 0; filter: brightness(2); }
                    60% { transform: translateY(20px) scale(1.05) rotate(2deg); opacity: 1; filter: brightness(1.5); }
                    80% { transform: translateY(-10px) scale(0.98) rotate(-1deg); opacity: 1; filter: brightness(1.2); }
                    100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
                }
                .fall-down-animation {
                    animation: fallDownFlashing 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
                    border: 1px solid rgba(212, 175, 55, 0.6);
                    border-radius: 12px;
                }
                .hover-opacity:hover { color: white !important; background: rgba(0,0,0,0.8) !important; transform: scale(1.1); }
            `}} />
        </main>
    );
}
