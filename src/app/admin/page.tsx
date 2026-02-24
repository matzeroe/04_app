"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Download, Image as ImageIcon, Loader2, Trash2, Settings, Save, RotateCw, Upload } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface ImageItem {
    filename: string;
    url: string;
    createdAt: number;
}

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [images, setImages] = useState<ImageItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [isDownloadingOriginals, setIsDownloadingOriginals] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [rotatingId, setRotatingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingBg, setIsUploadingBg] = useState(false);

    // Mehrfachauswahl
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

    // Custom Modal State anstelle von window.alert / window.confirm
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'alert' | 'confirm';
        onConfirm?: () => void;
    }>({ isOpen: false, title: "", message: "", type: "alert" });

    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [intervalTime, setIntervalTime] = useState<number>(5000);
    const [newImageInterval, setNewImageInterval] = useState<number>(5000);
    const [eventName, setEventName] = useState<string>("Ella & Matze");
    const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
    const [watermarkText, setWatermarkText] = useState<string>("02.05.2026\nElla & Matze");
    const [watermarkFontFamily, setWatermarkFontFamily] = useState<string>("Arial, Helvetica, sans-serif");
    const [watermarkFontSize, setWatermarkFontSize] = useState<number>(0.025);
    const [watermarkFontWeight, setWatermarkFontWeight] = useState<string>("bold");
    const [watermarkColor, setWatermarkColor] = useState<string>("#555555");
    const [watermarkFrameWidth, setWatermarkFrameWidth] = useState<number>(20);
    const [watermarkFrameBottom, setWatermarkFrameBottom] = useState<number>(80);
    const [watermarkBorderRadius, setWatermarkBorderRadius] = useState<number>(24);
    const [useWatermarkBgImage, setUseWatermarkBgImage] = useState<boolean>(false);
    const [useSlideshowBgImage, setUseSlideshowBgImage] = useState<boolean>(false);
    const [slideshowBgBlur, setSlideshowBgBlur] = useState<number>(20);
    const [useUploadPageBgImage, setUseUploadPageBgImage] = useState<boolean>(false);
    const [uploadBgBlur, setUploadBgBlur] = useState<number>(20);
    const [imageFilter, setImageFilter] = useState<string>("none");

    const [txtUploadTitle, setTxtUploadTitle] = useState("Teilt eure schönsten Momente unserer Hochzeit mit uns!");
    const [txtUploadButton, setTxtUploadButton] = useState("Fotos auswählen");
    const [txtUploadButtonSub, setTxtUploadButtonSub] = useState("Tippen Sie hier, um beliebig viele Bilder hinzuzufügen");
    const [txtUploadSubmit, setTxtUploadSubmit] = useState("Bild(er) hochladen");
    const [txtUploadSuccess, setTxtUploadSuccess] = useState("Erfolgreich hochgeladen!");
    const [txtUploadSuccessSub, setTxtUploadSuccessSub] = useState("Danke für eure Erinnerungen!");
    const [txtSlideshowLoginTitle, setTxtSlideshowLoginTitle] = useState("Diashow Login");
    const [txtSlideshowLoginSub, setTxtSlideshowLoginSub] = useState("Bitte geben Sie das Passwort für die Diashow ein.");
    const [txtSlideshowEmpty, setTxtSlideshowEmpty] = useState("Noch keine Bilder hochgeladen.");
    const [txtSlideshowEmptySub, setTxtSlideshowEmptySub] = useState("Scannt den Code und ladet das erste Foto hoch!");
    const [txtQrSlideTitle, setTxtQrSlideTitle] = useState("Macht mit!");
    const [txtQrSlideSub, setTxtQrSlideSub] = useState("Scannt den Code, um Fotos hochzuladen!");

    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isUploadingWatermarkBg, setIsUploadingWatermarkBg] = useState(false);
    const [isUploadingSlideshowBg, setIsUploadingSlideshowBg] = useState(false);
    const slideshowBgInputRef = useRef<HTMLInputElement>(null);

    // Initial load for LocalStorage Auth
    useEffect(() => {
        const storedAuth = localStorage.getItem("adminAuth");
        if (storedAuth === "true") {
            setIsAuthenticated(true);
            fetchImages();
            fetchSettings();
        }
    }, []);

    // Authentifizierung
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, type: "admin" })
            });

            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem("adminAuth", "true");
                fetchImages();
                fetchSettings();
            } else {
                setError("Falsches Passwort");
            }
        } catch (err) {
            setError("Verbindungsfehler");
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setIntervalTime(data.slideshowInterval || 5000);
                setNewImageInterval(data.newImageInterval || 5000);
                setEventName(data.eventName || "Ella & Matze");
                setWatermarkEnabled(data.watermarkEnabled || false);
                setWatermarkText(data.watermarkText || "02.05.2026\nElla & Matze");
                setWatermarkFontFamily(data.watermarkFontFamily || "Arial, Helvetica, sans-serif");
                setWatermarkFontSize(data.watermarkFontSize !== undefined ? data.watermarkFontSize : 0.025);
                setWatermarkFontWeight(data.watermarkFontWeight || "bold");
                setWatermarkColor(data.watermarkColor || "#555555");
                setWatermarkFrameWidth(data.watermarkFrameWidth !== undefined ? data.watermarkFrameWidth : 20);
                setWatermarkFrameBottom(data.watermarkFrameBottom !== undefined ? data.watermarkFrameBottom : 80);
                setWatermarkBorderRadius(data.watermarkBorderRadius !== undefined ? data.watermarkBorderRadius : 24);
                setUseWatermarkBgImage(data.useWatermarkBgImage || false);
                setUseSlideshowBgImage(data.useSlideshowBgImage || false);
                setSlideshowBgBlur(data.slideshowBgBlur !== undefined ? data.slideshowBgBlur : 20);
                setUseUploadPageBgImage(data.useUploadPageBgImage || false);
                setUploadBgBlur(data.uploadBgBlur !== undefined ? data.uploadBgBlur : 20);
                setImageFilter(data.imageFilter || "none");

                if (data.txtUploadTitle) setTxtUploadTitle(data.txtUploadTitle);
                if (data.txtUploadButton) setTxtUploadButton(data.txtUploadButton);
                if (data.txtUploadButtonSub) setTxtUploadButtonSub(data.txtUploadButtonSub);
                if (data.txtUploadSubmit) setTxtUploadSubmit(data.txtUploadSubmit);
                if (data.txtUploadSuccess) setTxtUploadSuccess(data.txtUploadSuccess);
                if (data.txtUploadSuccessSub) setTxtUploadSuccessSub(data.txtUploadSuccessSub);
                if (data.txtSlideshowLoginTitle) setTxtSlideshowLoginTitle(data.txtSlideshowLoginTitle);
                if (data.txtSlideshowLoginSub) setTxtSlideshowLoginSub(data.txtSlideshowLoginSub);
                if (data.txtSlideshowEmpty) setTxtSlideshowEmpty(data.txtSlideshowEmpty);
                if (data.txtSlideshowEmptySub) setTxtSlideshowEmptySub(data.txtSlideshowEmptySub);
                if (data.txtQrSlideTitle) setTxtQrSlideTitle(data.txtQrSlideTitle);
                if (data.txtQrSlideSub) setTxtQrSlideSub(data.txtQrSlideSub);
            }
        } catch (e) {
            console.error("Settings load error", e);
        }
    };

    const saveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slideshowInterval: intervalTime,
                    newImageInterval: newImageInterval,
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
                    imageFilter: imageFilter,
                    txtUploadTitle,
                    txtUploadButton,
                    txtUploadButtonSub,
                    txtUploadSubmit,
                    txtUploadSuccess,
                    txtUploadSuccessSub,
                    txtSlideshowLoginTitle,
                    txtSlideshowLoginSub,
                    txtSlideshowEmpty,
                    txtSlideshowEmptySub,
                    txtQrSlideTitle,
                    txtQrSlideSub
                })
            });
            if (res.ok) {
                setModalConfig({ isOpen: true, type: 'alert', title: "Erfolg", message: "Einstellungen gespeichert!" });
                setShowSettings(false);
            } else {
                setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Speichern." });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Speichern." });
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Bilder laden
    const fetchImages = async () => {
        try {
            const res = await fetch("/api/images");
            if (res.ok) {
                const data = await res.json();
                setImages(data.images);
            }
        } catch (err) {
            console.error("Fehler beim Laden der Bilder");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (filename: string) => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Bild löschen',
            message: 'Möchtest du dieses Bild wirklich unwiderruflich löschen?',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setDeletingId(filename);
                try {
                    const res = await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, {
                        method: "DELETE"
                    });

                    if (res.ok) {
                        setImages(prevImages => prevImages.filter(img => img.filename !== filename));
                    } else {
                        setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Löschen des Bildes" });
                    }
                } catch (err) {
                    setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler" });
                } finally {
                    setDeletingId(null);
                }
            }
        });
    };

    const toggleSelection = (filename: string) => {
        setSelectedImages(prev =>
            prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
        );
    };

    const handleDeleteSelected = () => {
        if (selectedImages.length === 0) return;

        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Ausgewählte Bilder löschen',
            message: `Möchtest du wirklich ${selectedImages.length} Bilder unwiderruflich löschen?`,
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setIsDeletingMultiple(true);

                try {
                    let deletedCount = 0;
                    for (const filename of selectedImages) {
                        const res = await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, {
                            method: "DELETE"
                        });
                        if (res.ok) deletedCount++;
                    }

                    // Erfolgreich gelöschte Bilder aus der UI entfernen
                    fetchImages(); // Einfach alles neu laden ist am sichersten
                    setSelectedImages([]);

                    if (deletedCount < selectedImages.length) {
                        setModalConfig({ isOpen: true, type: 'alert', title: "Hinweis", message: `Es konnten nur ${deletedCount} von ${selectedImages.length} gelöscht werden.` });
                    }
                } catch (err) {
                    setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler beim Löschen." });
                } finally {
                    setIsDeletingMultiple(false);
                }
            }
        });
    };

    const handleRotate = async (filename: string) => {
        setRotatingId(filename);
        try {
            const res = await fetch("/api/images/rotate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, rotation: 90 })
            });

            if (res.ok) {
                // Bild in der UI aktualisieren, indem wir einen Cache-Buster anhängen
                setImages(images.map(img => {
                    if (img.filename === filename) {
                        const urlWithoutQuery = img.url.split('?')[0];
                        return { ...img, url: `${urlWithoutQuery}?t=${Date.now()}` };
                    }
                    return img;
                }));
            } else {
                setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Drehen des Bildes" });
            }
        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler" });
        } finally {
            setRotatingId(null);
        }
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBg(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/background", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                setModalConfig({ isOpen: true, type: 'alert', title: "Erfolg", message: "Hintergrundbild erfolgreich aktualisiert!" });
                setShowSettings(false);
            } else {
                setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Hochladen des Hintergrundbildes." });
            }
        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler." });
        } finally {
            setIsUploadingBg(false);
        }
    };

    const handleSlideshowBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingSlideshowBg(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/slideshow-bg", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                setModalConfig({ isOpen: true, type: 'alert', title: "Erfolg", message: "Slideshow-Hintergrundbild gespeichert (Bitte speichere noch die Einstellungen)." });
                // Wir schalten den Toggle automatisch ein
                setUseSlideshowBgImage(true);
            } else {
                setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Hochladen des Slideshow-Hintergrundbildes." });
            }
        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler." });
        } finally {
            setIsUploadingSlideshowBg(false);
        }
    };

    const watermarkBgInputRef = useRef<HTMLInputElement>(null);

    const handleWatermarkBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingWatermarkBg(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/watermark-bg", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                setModalConfig({ isOpen: true, type: 'alert', title: "Erfolg", message: "Rahmen-Hintergrundbild gespeichert (Bitte speichere noch die Einstellungen)." });
                // Wir schalten den Toggle automatisch ein
                setUseWatermarkBgImage(true);
            } else {
                setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Hochladen des Rahmen-Hintergrundbildes." });
            }
        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Verbindungsfehler." });
        } finally {
            setIsUploadingWatermarkBg(false);
        }
    };

    const handleDownloadAll = async () => {
        setIsDownloadingAll(true);
        try {
            const zip = new JSZip();

            const promises = images.map(async (img, idx) => {
                const response = await fetch(img.url);
                const blob = await response.blob();
                zip.file(`hochzeit-${idx + 1}-${img.filename}`, blob);
            });

            await Promise.all(promises);
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "hochzeitsfotos.zip");

        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Es gab einen Fehler beim Erstellen der ZIP-Datei." });
            console.error(err);
        } finally {
            setIsDownloadingAll(false);
        }
    };

    const handleDownloadAllOriginals = async () => {
        setIsDownloadingOriginals(true);
        try {
            const zip = new JSZip();

            const promises = images.map(async (img, idx) => {
                // Determine original URL
                const originalUrl = `/uploads/originals/${img.filename}`;
                // Try fetching original
                const response = await fetch(originalUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    zip.file(`original-${idx + 1}-${img.filename}`, blob);
                } else {
                    // Fallback to the watermarked one if original doesn't exist
                    const fbResponse = await fetch(img.url);
                    const fbBlob = await fbResponse.blob();
                    zip.file(`hochzeit-${idx + 1}-${img.filename}`, fbBlob);
                }
            });

            await Promise.all(promises);
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "hochzeitsfotos-originale.zip");

        } catch (err) {
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Es gab einen Fehler beim Erstellen der ZIP-Datei." });
            console.error(err);
        } finally {
            setIsDownloadingOriginals(false);
        }
    };

    const handleSingleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            saveAs(blob, filename);
        } catch (err) {
            console.error("Fehler beim Einzel-Download", err);
            setModalConfig({ isOpen: true, type: 'alert', title: "Fehler", message: "Fehler beim Herunterladen des Bildes." });
        }
    };

    // --- LOGIN SCREEN ---
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
                    <h2 style={{ marginBottom: "20px" }}>Brautpaar Login</h2>
                    <p style={{ color: "var(--color-text-light)", marginBottom: "30px", fontSize: "0.95rem" }}>
                        Hier könnt ihr alle hochgeladenen Bilder ansehen und verwalten.
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
                            Einloggen
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    // --- ADMIN DASHBOARD ---
    if (isLoading) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 className="animate-spin" size={48} style={{ color: "var(--color-primary)" }} />
            </main>
        );
    }

    return (
        <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

                <div className="glass-panel" style={{
                    padding: "30px",
                    marginBottom: "40px",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px"
                }}>
                    <div>
                        <h1>Eure Hochzeitsgalerie</h1>
                        <p style={{ color: "var(--color-text-light)", marginTop: "8px" }}>
                            {images.length} {images.length === 1 ? 'Foto wurde' : 'Fotos wurden'} hochgeladen.
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            className="btn-outline"
                            onClick={() => setShowSettings(!showSettings)}
                            style={{ padding: "14px", display: "flex" }}
                            title="Einstellungen"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            className="btn-outline"
                            onClick={handleDownloadAllOriginals}
                            disabled={isDownloadingOriginals || images.length === 0}
                            style={{ minWidth: "220px", display: "flex", gap: "8px", alignItems: "center" }}
                        >
                            {isDownloadingOriginals ? (
                                <><Loader2 className="animate-spin" size={20} /> ZIP wird erstellt...</>
                            ) : (
                                <><Download size={20} /> Originale herunterladen</>
                            )}
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleDownloadAll}
                            disabled={isDownloadingAll || images.length === 0}
                            style={{ minWidth: "220px", display: "flex", gap: "8px", alignItems: "center" }}
                        >
                            {isDownloadingAll ? (
                                <><Loader2 className="animate-spin" size={20} /> ZIP wird erstellt...</>
                            ) : (
                                <><Download size={20} /> Alle herunterladen</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="glass-panel animate-fade-up" style={{
                        padding: "24px",
                        marginBottom: "30px",
                        background: "rgba(255,255,255,0.9)",
                        borderLeft: "4px solid var(--color-primary)"
                    }}>
                        <h3 style={{ marginBottom: "16px" }}>Diashow Einstellungen</h3>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                            <div style={{ flex: 1, minWidth: "150px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--color-text-light)" }}>
                                    Normale Anzeigedauer pro Bild (Sekunden)
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={intervalTime / 1000}
                                    onChange={(e) => setIntervalTime(Math.max(1, parseInt(e.target.value) || 5) * 1000)}
                                    min="1" max="60"
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: "150px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--color-text-light)" }}>
                                    Spezial-Dauer für <b>neue</b> Bilder (Sekunden)
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={newImageInterval / 1000}
                                    onChange={(e) => setNewImageInterval(Math.max(1, parseInt(e.target.value) || 5) * 1000)}
                                    min="1" max="60"
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <button
                                className="btn-primary"
                                onClick={saveSettings}
                                disabled={isSavingSettings}
                                style={{ height: "48px" }}
                            >
                                {isSavingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Speichern
                            </button>
                        </div>

                        {/* Diashow Hintergrundbild */}
                        <div style={{ padding: "16px", background: "rgba(0,0,0,0.03)", borderRadius: "8px", marginBottom: "24px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "12px" }}>
                                <input
                                    type="checkbox"
                                    checked={useSlideshowBgImage}
                                    onChange={(e) => setUseSlideshowBgImage(e.target.checked)}
                                    style={{ width: "16px", height: "16px" }}
                                />
                                <span style={{ fontWeight: "bold" }}>Eigenes Hintergrundbild für Diashow verwenden</span>
                            </label>
                            <p style={{ fontSize: "0.85rem", color: "var(--color-text-light)", marginBottom: "12px" }}>
                                Wenn aktiviert, wird dieses Bild unscharf (blur) als schicker Hintergrund der Diashow angezeigt.
                            </p>
                            {useSlideshowBgImage && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", background: "white", padding: "12px", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <label style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Unschärfe (Blur) Regler:</label>
                                        <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold" }}>{slideshowBgBlur}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={slideshowBgBlur}
                                        onChange={(e) => setSlideshowBgBlur(parseInt(e.target.value) || 0)}
                                        style={{ width: "100%", cursor: "pointer" }}
                                    />
                                </div>
                            )}
                            <input
                                type="file"
                                ref={slideshowBgInputRef}
                                onChange={handleSlideshowBgUpload}
                                accept="image/*"
                                style={{ display: "none" }}
                            />
                            <button
                                className="btn-outline"
                                onClick={() => slideshowBgInputRef.current?.click()}
                                disabled={isUploadingSlideshowBg}
                                style={{ fontSize: "0.9rem", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                            >
                                {isUploadingSlideshowBg ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                Hintergrundbild für Diashow (.jpg/.png) hochladen
                            </button>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", marginBottom: "24px" }} />

                        <h3 style={{ marginBottom: "16px" }}>Bild-Effekte & Polaroid-Rahmen</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Foto-Filter (wird vor dem Rahmen angewendet):</label>
                                <select
                                    className="input-field"
                                    value={imageFilter}
                                    onChange={(e) => setImageFilter(e.target.value)}
                                >
                                    <option value="none">Kein Filter (Originalfarbe)</option>
                                    <option value="grayscale">Schwarz-Weiß (Grayscale)</option>
                                    <option value="sepia">Sepia (Retro-Look)</option>
                                </select>
                            </div>

                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "16px" }}>
                                <input
                                    type="checkbox"
                                    checked={watermarkEnabled}
                                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span>Polaroid-Rahmen für neue Bilder generieren</span>
                            </label>

                            {watermarkEnabled && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Wasserzeichen Text (Mehrzeilig möglich):</label>
                                        <textarea
                                            className="input-field"
                                            value={watermarkText}
                                            onChange={(e) => setWatermarkText(e.target.value)}
                                            placeholder={"02.05.2026\nElla & Matze"}
                                            rows={3}
                                            style={{ resize: "vertical", fontFamily: "inherit" }}
                                        />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Schriftart:</label>
                                            <select
                                                className="input-field"
                                                value={watermarkFontFamily}
                                                onChange={(e) => setWatermarkFontFamily(e.target.value)}
                                            >
                                                <option value="Arial, Helvetica, sans-serif">Arial / Helvetica (Serifenlos)</option>
                                                <option value="'Times New Roman', Times, serif">Times New Roman (Serifen)</option>
                                                <option value="'Courier New', Courier, monospace">Courier New (Monospace)</option>
                                                <option value="Georgia, serif">Georgia (Serifen)</option>
                                                <option value="Verdana, Geneva, sans-serif">Verdana (Serifenlos)</option>
                                            </select>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Schriftgröße:</label>
                                            <select
                                                className="input-field"
                                                value={watermarkFontSize.toString()}
                                                onChange={(e) => setWatermarkFontSize(parseFloat(e.target.value))}
                                            >
                                                <option value="0.015">Sehr Klein</option>
                                                <option value="0.020">Klein</option>
                                                <option value="0.025">Mittel (Standard)</option>
                                                <option value="0.035">Groß</option>
                                                <option value="0.050">Sehr Groß</option>
                                            </select>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Schriftdicke:</label>
                                            <select
                                                className="input-field"
                                                value={watermarkFontWeight}
                                                onChange={(e) => setWatermarkFontWeight(e.target.value)}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Fett (Bold)</option>
                                            </select>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Textfarbe:</label>
                                            <input
                                                type="color"
                                                className="input-field"
                                                value={watermarkColor}
                                                onChange={(e) => setWatermarkColor(e.target.value)}
                                                style={{ padding: "0", height: "42px", cursor: "pointer" }}
                                            />
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Rahmendicke (Rand) [px]:</label>
                                            <input
                                                type="number"
                                                className="input-field"
                                                value={watermarkFrameWidth}
                                                onChange={(e) => setWatermarkFrameWidth(parseInt(e.target.value) || 0)}
                                                min="0" max="200"
                                            />
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Rahmendicke (Unten) [px]:</label>
                                            <input
                                                type="number"
                                                className="input-field"
                                                value={watermarkFrameBottom}
                                                onChange={(e) => setWatermarkFrameBottom(parseInt(e.target.value) || 0)}
                                                min="0" max="400"
                                            />
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Ecken-Radius der Fotos [px]:</label>
                                            <input
                                                type="number"
                                                className="input-field"
                                                value={watermarkBorderRadius}
                                                onChange={(e) => setWatermarkBorderRadius(parseInt(e.target.value) || 0)}
                                                min="0" max="100"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: "8px", padding: "16px", background: "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "12px" }}>
                                            <input
                                                type="checkbox"
                                                checked={useWatermarkBgImage}
                                                onChange={(e) => setUseWatermarkBgImage(e.target.checked)}
                                                style={{ width: "16px", height: "16px" }}
                                            />
                                            <span style={{ fontWeight: "bold" }}>Eigenes Bild als Rahmen-Hintergrund verwenden</span>
                                        </label>
                                        <p style={{ fontSize: "0.85rem", color: "var(--color-text-light)", marginBottom: "12px" }}>
                                            Wenn aktiviert, wird (anstelle eines weißen Rahmens) das unten hochgeladene Bild auf die Endgröße skaliert.
                                        </p>
                                        <input
                                            type="file"
                                            ref={watermarkBgInputRef}
                                            onChange={handleWatermarkBgUpload}
                                            accept="image/*"
                                            style={{ display: "none" }}
                                        />
                                        <button
                                            className="btn-outline"
                                            onClick={() => watermarkBgInputRef.current?.click()}
                                            disabled={isUploadingWatermarkBg}
                                            style={{ fontSize: "0.9rem", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                                        >
                                            {isUploadingWatermarkBg ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                            Hintergrundbild für Rahmen (.jpg/.png) hochladen
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", marginBottom: "24px" }} />

                        <h3 style={{ marginBottom: "16px" }}>Upload-Bereich anpassen</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ color: "var(--color-text-light)", fontSize: "0.9rem" }}>Titel der Veranstaltung (Startseite):</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder="z.B. Ella & Matze"
                                />
                            </div>

                            <div>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                                    <input
                                        type="checkbox"
                                        checked={useUploadPageBgImage}
                                        onChange={(e) => setUseUploadPageBgImage(e.target.checked)}
                                        style={{ width: "16px", height: "16px" }}
                                    />
                                    <span style={{ fontWeight: "bold" }}>Allgemeines Hintergrundbild für Startseite verwenden</span>
                                </label>
                                <p style={{ fontSize: "0.9rem", color: "var(--color-text-light)", marginBottom: "12px" }}>
                                    Hier kannst du ein Bild hochladen, das auf der Startseite vollflächig als verschwommener Hintergrund angezeigt wird.
                                </p>

                                {useUploadPageBgImage && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", background: "rgba(0,0,0,0.03)", padding: "12px", borderRadius: "8px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <label style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Unschärfe (Blur) Regler:</label>
                                            <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold" }}>{uploadBgBlur}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={uploadBgBlur}
                                            onChange={(e) => setUploadBgBlur(parseInt(e.target.value) || 0)}
                                            style={{ width: "100%", cursor: "pointer" }}
                                        />
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleBackgroundUpload}
                                    accept="image/*"
                                    style={{ display: "none" }}
                                />

                                <button
                                    className="btn-outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingBg}
                                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                                >
                                    {isUploadingBg ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                    Hintergrundbild auswählen & hochladen
                                </button>
                            </div>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "24px 0" }} />

                        <h3 style={{ marginBottom: "16px" }}>Texte &amp; Beschriftungen</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            <div style={{ padding: "15px", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                                <h4 style={{ marginBottom: "10px", color: "var(--color-text)", fontWeight: "bold" }}>Upload-Seite (Titel & Buttons)</h4>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Upload-Bereich Titel</label>
                                    <input type="text" className="input-field" value={txtUploadTitle} onChange={(e) => setTxtUploadTitle(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Button (Fotos auswählen)</label>
                                    <input type="text" className="input-field" value={txtUploadButton} onChange={(e) => setTxtUploadButton(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Button Untertitel</label>
                                    <input type="text" className="input-field" value={txtUploadButtonSub} onChange={(e) => setTxtUploadButtonSub(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Upload Submit Text (verwende {"{count}"} für Anzahl)</label>
                                    <input type="text" className="input-field" value={txtUploadSubmit} onChange={(e) => setTxtUploadSubmit(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ padding: "15px", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                                <h4 style={{ marginBottom: "10px", color: "var(--color-text)", fontWeight: "bold" }}>Upload-Seite (Erfolg)</h4>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Erfolgreich Titel</label>
                                    <input type="text" className="input-field" value={txtUploadSuccess} onChange={(e) => setTxtUploadSuccess(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Erfolgreich Untertitel</label>
                                    <input type="text" className="input-field" value={txtUploadSuccessSub} onChange={(e) => setTxtUploadSuccessSub(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ padding: "15px", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                                <h4 style={{ marginBottom: "10px", color: "var(--color-text)", fontWeight: "bold" }}>Diashow</h4>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Login Titel</label>
                                    <input type="text" className="input-field" value={txtSlideshowLoginTitle} onChange={(e) => setTxtSlideshowLoginTitle(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Login Untertitel</label>
                                    <input type="text" className="input-field" value={txtSlideshowLoginSub} onChange={(e) => setTxtSlideshowLoginSub(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Leer (Keine Bilder) Titel</label>
                                    <input type="text" className="input-field" value={txtSlideshowEmpty} onChange={(e) => setTxtSlideshowEmpty(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Leer (Keine Bilder) Untertitel</label>
                                    <input type="text" className="input-field" value={txtSlideshowEmptySub} onChange={(e) => setTxtSlideshowEmptySub(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px", borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", fontWeight: "bold" }}>QR Code Slide (als erstes Slide in der Diashow)</label>
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Titel über QR Code</label>
                                    <input type="text" className="input-field" value={txtQrSlideTitle} onChange={(e) => setTxtQrSlideTitle(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem" }}>Untertitel unter QR Code</label>
                                    <input type="text" className="input-field" value={txtQrSlideSub} onChange={(e) => setTxtQrSlideSub(e.target.value)} />
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Gallery Toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span style={{ color: "var(--color-text-light)" }}>
                            {images.length} {images.length === 1 ? "Bild" : "Bilder"} gesamt
                        </span>

                        {images.length > 0 && (
                            <button
                                onClick={() => {
                                    if (selectedImages.length === images.length) {
                                        setSelectedImages([]);
                                    } else {
                                        setSelectedImages(images.map(img => img.filename));
                                    }
                                }}
                                style={{
                                    background: "rgba(255, 255, 255, 0.5)",
                                    border: "1px solid var(--glass-border)",
                                    borderRadius: "8px",
                                    padding: "4px 12px",
                                    fontSize: "0.85rem",
                                    color: "var(--color-text)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                                className="hover-scale"
                            >
                                {selectedImages.length === images.length ? "Auswahl aufheben" : "Alle auswählen"}
                            </button>
                        )}

                        {selectedImages.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(224, 122, 95, 0.2)", padding: "4px 12px", borderRadius: "20px" }}>
                                <span style={{ color: "var(--color-error)", fontWeight: "bold" }}>{selectedImages.length} markiert</span>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="btn-primary"
                                    style={{ background: "var(--color-error)", padding: "4px 12px", border: "none", fontSize: "0.85rem" }}
                                    disabled={isDeletingMultiple}
                                >
                                    {isDeletingMultiple ? <Loader2 className="animate-spin" size={14} /> : "Löschen"}
                                </button>
                                <button
                                    onClick={() => setSelectedImages([])}
                                    style={{ background: "none", border: "none", color: "var(--color-text-light)", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                                >
                                    Aufheben
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gallery */}
                {images.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "80px 20px", textAlign: "center" }}>
                        <ImageIcon size={64} style={{ opacity: 0.3, margin: "0 auto 20px" }} />
                        <h3>Noch keine Bilder hochgeladen</h3>
                        <p style={{ color: "var(--color-text-light)" }}>Teilt den Link mit euren Gästen!</p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "24px"
                    }}>
                        {images.map((img) => (
                            <div
                                key={img.filename}
                                className="glass-panel hover-scale"
                                style={{ overflow: "hidden", position: "relative", padding: "10px" }}
                            >
                                <div style={{
                                    width: "100%",
                                    paddingBottom: "100%",
                                    position: "relative",
                                    borderRadius: "16px",
                                    overflow: "hidden"
                                }}>
                                    <img
                                        src={img.url}
                                        alt="Gast Upload"
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover"
                                        }}
                                        loading="lazy"
                                    />

                                    {/* Selection Checkbox */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleSelection(img.filename); }}
                                        style={{
                                            position: "absolute",
                                            top: "10px",
                                            left: "10px",
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "4px",
                                            background: selectedImages.includes(img.filename) ? "var(--color-primary)" : "rgba(0,0,0,0.4)",
                                            border: "2px solid white",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            zIndex: 10,
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {selectedImages.includes(img.filename) && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>

                                    {/* Hover Overlay mit Download & Löschen */}
                                    <div
                                        className="image-overlay"
                                        style={{
                                            position: "absolute",
                                            bottom: 0, left: 0, right: 0,
                                            padding: "20px",
                                            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            opacity: 0,
                                            transition: "opacity 0.2s ease"
                                        }}
                                    >
                                        <button
                                            onClick={() => handleDelete(img.filename)}
                                            className="btn-outline"
                                            style={{
                                                padding: "8px",
                                                background: "rgba(224, 122, 95, 0.9)",
                                                borderColor: "transparent",
                                                color: "white"
                                            }}
                                            title="Bild löschen"
                                            disabled={deletingId === img.filename}
                                        >
                                            {deletingId === img.filename ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                        </button>

                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => handleRotate(img.filename)}
                                                className="btn-primary"
                                                style={{ padding: "8px", background: "rgba(0,0,0,0.6)" }}
                                                title="Bild 90° drehen"
                                                disabled={rotatingId === img.filename}
                                            >
                                                {rotatingId === img.filename ? <Loader2 className="animate-spin" size={16} /> : <RotateCw size={16} />}
                                            </button>

                                            <button
                                                onClick={() => handleSingleDownload(img.url, img.filename)}
                                                className="btn-primary"
                                                style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                                                title="Bild herunterladen"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hover-scale { transition: transform 0.3s ease; }
                .hover-scale:hover { transform: translateY(-5px); }
                .hover-scale:hover .image-overlay { opacity: 1 !important; }
                `}} />

            {/* Custom Modal */}
            {modalConfig.isOpen && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1000,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}>
                    <div className="glass-panel animate-fade-up" style={{
                        maxWidth: "400px",
                        width: "100%",
                        padding: "30px",
                        textAlign: "center"
                    }}>
                        <h3 style={{ marginBottom: "16px", color: "var(--color-primary)" }}>{modalConfig.title}</h3>
                        <p style={{ color: "var(--color-text-light)", marginBottom: "24px" }}>{modalConfig.message}</p>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            {modalConfig.type === 'confirm' && (
                                <button
                                    className="btn-outline"
                                    onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                                >
                                    Abbrechen
                                </button>
                            )}
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    if (modalConfig.type === 'confirm' && modalConfig.onConfirm) {
                                        modalConfig.onConfirm();
                                    } else {
                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                    }
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
