"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Play, Image as ImageIcon, Maximize, Minimize } from "lucide-react";
import QRCode from "react-qr-code";

export default function SlideshowAlt() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<any[]>([]);

    // Tracking current and previous for the swipe up / drop down animations
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastIndex, setLastIndex] = useState(-1);

    const [isLoading, setIsLoading] = useState(true);
    const [intervalTime, setIntervalTime] = useState(5000);
    const [newImageInterval, setNewImageInterval] = useState(5000);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isControlsVisible, setIsControlsVisible] = useState(true);

    const [useSlideshowBgImage, setUseSlideshowBgImage] = useState(false);
    const [slideshowBgBlur, setSlideshowBgBlur] = useState<number>(20);

    const [txtSlideshowLoginTitle, setTxtSlideshowLoginTitle] = useState("Diashow Login");
    const [txtSlideshowLoginSub, setTxtSlideshowLoginSub] = useState("Bitte geben Sie das Passwort für die Diashow ein.");
    const [txtSlideshowEmpty, setTxtSlideshowEmpty] = useState("Noch keine Bilder hochgeladen.");
    const [txtSlideshowEmptySub, setTxtSlideshowEmptySub] = useState("Scannt den Code und ladet das erste Foto hoch!");
    const [txtQrSlideTitle, setTxtQrSlideTitle] = useState("Macht mit!");
    const [txtQrSlideSub, setTxtQrSlideSub] = useState("Scannt den Code, um Fotos hochzuladen!");

    const containerRef = useRef<HTMLDivElement>(null);
    const currentIndexRef = useRef(currentIndex);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        const storedAuth = localStorage.getItem("slideshowAuth");
        if (storedAuth === "true") {
            setIsAuthenticated(true);
            fetchImagesAndSettings();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        let mouseTimeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            setIsControlsVisible(true);
            clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => setIsControlsVisible(false), 3000);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        window.addEventListener("mousemove", handleMouseMove);
        handleMouseMove();

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(mouseTimeout);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen().catch(err => console.error(err));
        }
    };

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

    const fetchImagesAndSettings = async () => {
        try {
            const [imgRes, settingsRes] = await Promise.all([
                fetch("/api/images"),
                fetch("/api/settings")
            ]);

            if (imgRes.ok) {
                const data = await imgRes.json();

                // Erstelle das Pseudo-Slide für den QR Code
                const qrSlide = { isQrSlide: true, url: "qr-placeholder", filename: "qr-code" };

                setImages((prev: any[]) => {
                    let serverImages = data.images;
                    // Füge das QR-Slide am Anfang hinzu, wenn es nicht leer ist (immer als erstes slide)
                    let newImageArray = [qrSlide, ...serverImages];

                    if (prev.length === 0) return newImageArray;

                    const oldUrls = new Set(prev.map(i => i.url));
                    const newOnes = serverImages.filter((i: any) => !oldUrls.has(i.url));

                    if (newOnes.length > 0) {
                        const insertIdx = (currentIndexRef.current + 1) % (prev.length + 1);
                        const taggedNewOnes = newOnes.map((img: any) => ({ ...img, isNew: true }));
                        const newImages = [...prev];
                        newImages.splice(insertIdx, 0, ...taggedNewOnes);

                        // Clear the 'isNew' tag after animation finishes
                        setTimeout(() => {
                            setImages(curr => curr.map(img => ({ ...img, isNew: false })));
                        }, 2000);

                        return newImages;
                    }
                    return prev;
                });
            }

            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                if (settings.slideshowInterval) setIntervalTime(settings.slideshowInterval);
                if (settings.newImageInterval) setNewImageInterval(settings.newImageInterval);
                if (settings.useSlideshowBgImage !== undefined) setUseSlideshowBgImage(settings.useSlideshowBgImage);
                if (settings.slideshowBgBlur !== undefined) setSlideshowBgBlur(settings.slideshowBgBlur);
                if (settings.txtSlideshowLoginTitle) setTxtSlideshowLoginTitle(settings.txtSlideshowLoginTitle);
                if (settings.txtSlideshowLoginSub) setTxtSlideshowLoginSub(settings.txtSlideshowLoginSub);
                if (settings.txtSlideshowEmpty) setTxtSlideshowEmpty(settings.txtSlideshowEmpty);
                if (settings.txtSlideshowEmptySub) setTxtSlideshowEmptySub(settings.txtSlideshowEmptySub);
                if (settings.txtQrSlideTitle) setTxtQrSlideTitle(settings.txtQrSlideTitle);
                if (settings.txtQrSlideSub) setTxtQrSlideSub(settings.txtQrSlideSub);
            }
        } catch (err) {
            console.error("Fehler beim Laden");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            fetchImagesAndSettings();
        }, 10000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || images.length === 0) return;

        const timeoutId = setTimeout(() => {
            setLastIndex(currentIndex);
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, intervalTime);

        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, images.length, intervalTime, currentIndex]);

    const getThumbnails = () => {
        if (images.length === 0) return [];
        const thumbs = [];
        // Vorherige 10 Bilder, Aktuelles Bild (0), Nächste 10 Bilder
        for (let i = -10; i <= 10; i++) {
            const idx = (currentIndex + i + images.length * 10) % images.length;
            thumbs.push({ ...images[idx], relativeIndex: i });
        }
        return thumbs;
    };

    if (!isAuthenticated) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <div className="glass-panel animate-fade-up" style={{ maxWidth: "400px", width: "100%", padding: "40px", textAlign: "center" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(212, 175, 55, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                        <Lock size={28} style={{ color: "var(--color-primary)" }} />
                    </div>
                    <h2 style={{ marginBottom: "20px" }}>{txtSlideshowLoginTitle}</h2>
                    <p style={{ color: "var(--color-text-light)", marginBottom: "30px", fontSize: "0.95rem" }}>
                        {txtSlideshowLoginSub}
                    </p>
                    <form onSubmit={handleLogin}>
                        <input type="password" className="input-field" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: "20px" }} />
                        {error && <p style={{ color: "var(--color-error)", marginBottom: "16px" }}>{error}</p>}
                        <button type="submit" className="btn-primary" style={{ width: "100%" }}><Play size={18} style={{ marginRight: "8px" }} /> Diashow starten</button>
                    </form>
                </div>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", justifyContent: "center", background: "#000" }}>
                <div className="animate-spin" style={{ width: "40px", height: "40px", border: "3px solid rgba(212, 175, 55, 0.2)", borderTopColor: "var(--color-primary)", borderRadius: "50%" }}></div>
                <p style={{ color: "var(--color-text-light)", letterSpacing: "2px", textTransform: "uppercase", fontSize: "0.8rem" }}>Lade Momente...</p>
            </main>
        );
    }

    if (images.length === 0) {
        return (
            <main style={{ minHeight: "100vh", background: "#000", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {useSlideshowBgImage && (
                    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
                        <img src={`/api/public/slideshow-bg.jpg?t=${Date.now()}`} alt="Background" style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${slideshowBgBlur}px)`, transform: `scale(${1 + (slideshowBgBlur * 0.01)})`, opacity: 0.4 }} />
                    </div>
                )}
                <div className="glass-panel animate-fade-up" style={{ textAlign: "center", zIndex: 10, padding: "40px", maxWidth: "600px", background: "rgba(255, 255, 255, 0.9)" }}>
                    <p style={{ color: "var(--color-text)", marginBottom: "20px", fontSize: "1.2rem", fontWeight: "bold" }}>{txtSlideshowEmpty}</p>
                    <div style={{ display: "inline-block", background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                        <QRCode value={typeof window !== "undefined" ? window.location.origin : ""} size={200} style={{ display: "block", margin: "0 auto" }} />
                    </div>
                    <p style={{ color: "var(--color-primary)", marginTop: "20px", fontSize: "1.2rem", fontWeight: "bold" }}>{txtSlideshowEmptySub}</p>
                </div>
            </main>
        );
    }

    const currentImage = images[currentIndex];

    return (
        <main ref={containerRef} style={{ minHeight: "100vh", background: "#000", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Custom Background */}
            {useSlideshowBgImage && (
                <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
                    <img src={`/api/public/slideshow-bg.jpg?t=${Date.now()}`} alt="Background" style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${slideshowBgBlur}px)`, transform: `scale(${1 + (slideshowBgBlur * 0.01)})`, opacity: 0.4 }} />
                </div>
            )}

            {/* Top Thumbnail Bar */}
            <div style={{
                width: "100%",
                height: "120px",
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                zIndex: 30,
                position: "relative",
                padding: "0 20px",
                overflow: "hidden"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    // The track smoothly shifts left/right based on the current index
                    transform: `translateX(calc(50vw - ${Math.max(0, currentIndex - 1) * (80 + 12) + 45}px))`,
                    transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                    {images.filter(img => !img.isQrSlide).map((img, idx) => {
                        const isCurrent = currentIndex !== 0 && idx === currentIndex - 1;
                        return (
                            <div
                                key={`${img.url}-${idx}`}
                                className={img.isNew ? "drop-in-thumbnail" : ""}
                                style={{
                                    flexShrink: 0,
                                    width: isCurrent ? "90px" : "80px",
                                    height: isCurrent ? "90px" : "80px",
                                    opacity: isCurrent ? 1 : 0.5,
                                    transition: img.isNew ? "none" : "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                                    transform: isCurrent ? "scale(1.05)" : "scale(1)",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    border: isCurrent ? "3px solid lightgreen" : "none",
                                    boxShadow: isCurrent ? "0 0 15px rgba(144, 238, 144, 0.8)" : "0 4px 10px rgba(0,0,0,0.3)",
                                    background: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <img src={img.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, position: "relative", zIndex: 10 }}>
                {images.map((img, index) => {
                    const isCurrent = index === currentIndex;
                    const isPrev = index === lastIndex;

                    let opacity = 0;
                    // Startposition: Oben (in der Leiste versteckt)
                    let transform = "translateY(-100vh) scale(0.6)";
                    let zIndex = 0;

                    if (isCurrent) {
                        opacity = 1;
                        // Endposition: Mitte vom Viewport
                        transform = "translateY(0) scale(1)";
                        zIndex = 10;
                    } else if (isPrev) {
                        opacity = 0;
                        // Swipe-Up: Von der Mitte wieder nach Oben
                        transform = "translateY(-100vh) scale(0.6)";
                        zIndex = 5;
                    }

                    return (
                        <div
                            key={img.url}
                            style={{
                                position: "absolute",
                                inset: 0,
                                opacity: opacity,
                                transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                zIndex: zIndex,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "40px",
                                transform: transform,
                                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
                                width: "100%",
                                height: "100%",
                                boxSizing: "border-box"
                            }}
                        >
                            {img.isQrSlide ? (
                                <div style={{
                                    background: "rgba(255, 255, 255, 0.9)",
                                    padding: "60px",
                                    borderRadius: "24px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
                                }}>
                                    <p style={{ color: "var(--color-text)", marginBottom: "30px", fontSize: "1.5rem", fontWeight: "bold" }}>{txtQrSlideTitle}</p>
                                    <div style={{ background: "white", padding: "20px", borderRadius: "16px" }}>
                                        <QRCode value={typeof window !== "undefined" ? window.location.origin : ""} size={300} />
                                    </div>
                                    <p style={{ color: "var(--color-primary)", marginTop: "30px", fontSize: "1.5rem", fontWeight: "bold" }}>{txtQrSlideSub}</p>
                                </div>
                            ) : (
                                <img
                                    src={img.url}
                                    alt="Hochzeitsfoto"
                                    style={{
                                        height: "100%",
                                        width: "100%",
                                        objectFit: "contain",
                                        borderRadius: "12px",
                                        display: "block"
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* QR-Code Block unten links */}
            {currentImage && !currentImage.isQrSlide && (
                <div style={{ position: "absolute", bottom: "30px", left: "40px", zIndex: 10, background: "rgba(255, 255, 255, 0.9)", padding: "12px", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", textAlign: "center" }}>
                    <QRCode value={typeof window !== "undefined" ? `${window.location.origin}${currentImage.url}` : ""} size={80} style={{ display: "block" }} />
                </div>
            )}

            {/* Fullscreen Toggle */}
            <button
                onClick={toggleFullscreen}
                style={{
                    position: "absolute", top: "30px", right: "40px", zIndex: 40, background: "rgba(0,0,0,0.5)", border: "none", color: "rgba(255,255,255,0.7)", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", transition: "all 0.3s ease",
                    opacity: isControlsVisible ? 1 : 0, pointerEvents: isControlsVisible ? "auto" : "none"
                }}
                className="hover-opacity"
            >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fallDownFlashingAlt {
                    0% { transform: translateY(-100vh) scale(0.6) rotate(-5deg); opacity: 0; filter: brightness(2); }
                    60% { transform: translateY(10px) scale(1.02) rotate(1deg); opacity: 1; filter: brightness(1.5); }
                    80% { transform: translateY(-5px) scale(0.98) rotate(0deg); opacity: 1; filter: brightness(1.2); }
                    100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
                }
                @keyframes dropInThumbnail {
                    0% { transform: translateY(-100px) scale(0.5); opacity: 0; width: 0px; margin-right: 0px; }
                    50% { width: 80px; transform: translateY(-50px) scale(0.8); opacity: 0.8; }
                    100% { transform: translateY(0) scale(1); opacity: 0.5; width: 80px; }
                }
                .drop-in-thumbnail {
                    animation: dropInThumbnail 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .hover-opacity:hover { color: white !important; background: rgba(0,0,0,0.8) !important; transform: scale(1.1); }
            `}} />
        </main>
    );
}
