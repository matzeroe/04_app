"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle, Image as ImageIcon, Loader2, X, RotateCw, Lock } from "lucide-react";

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number;
}

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Config State
  const [eventName, setEventName] = useState("Ella & Matze");
  const [useUploadPageBgImage, setUseUploadPageBgImage] = useState(false);
  const [uploadBgBlur, setUploadBgBlur] = useState<number>(20);

  // Custom Texts
  const [txtUploadTitle, setTxtUploadTitle] = useState("Teilt eure schönsten Momente unserer Hochzeit mit uns!");
  const [txtUploadButton, setTxtUploadButton] = useState("Fotos auswählen");
  const [txtUploadButtonSub, setTxtUploadButtonSub] = useState("Tippen Sie hier, um beliebig viele Bilder hinzuzufügen");
  const [txtUploadSubmit, setTxtUploadSubmit] = useState("Bild(er) hochladen");
  const [txtUploadSuccess, setTxtUploadSuccess] = useState("Erfolgreich hochgeladen!");
  const [txtUploadSuccessSub, setTxtUploadSuccessSub] = useState("Danke für eure Erinnerungen!");
  const [txtSlideshowLoginSub, setTxtSlideshowLoginSub] = useState("Bitte geben Sie das Passwort für die Diashow ein.");

  useEffect(() => {
    // Event Titel aus Settings laden
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.eventName) setEventName(data.eventName);
          if (data.useUploadPageBgImage !== undefined) setUseUploadPageBgImage(data.useUploadPageBgImage);
          if (data.uploadBgBlur !== undefined) setUploadBgBlur(data.uploadBgBlur);
          if (data.txtUploadTitle) setTxtUploadTitle(data.txtUploadTitle);
          if (data.txtUploadButton) setTxtUploadButton(data.txtUploadButton);
          if (data.txtUploadButtonSub) setTxtUploadButtonSub(data.txtUploadButtonSub);
          if (data.txtUploadSubmit) setTxtUploadSubmit(data.txtUploadSubmit);
          if (data.txtUploadSuccess) setTxtUploadSuccess(data.txtUploadSuccess);
          if (data.txtUploadSuccessSub) setTxtUploadSuccessSub(data.txtUploadSuccessSub);
          if (data.txtSlideshowLoginSub) setTxtSlideshowLoginSub(data.txtSlideshowLoginSub);
        }
      } catch (e) {
        console.error("Fehler beim Laden der Einstellungen", e);
      }
    };
    fetchSettings();

    // Prüfen, ob der Gast bereits authentifiziert ist
    const isAuth = localStorage.getItem("guest_auth");
    if (isAuth === "true") {
      setIsAuthenticated(true);
    }

    // Prüfen, ob ein custom-bg existiert
    const checkBackground = async () => {
      try {
        // Wir versuchen, das Bild abzurufen.
        // Um Caching zu umgehen, setzen wir einen Timestamp an.
        // Da wir nicht genau wissen ob .jpg oder .png hängen wir einfach /custom-bg.jpg an.
        // (Für eine echte Prod-App könnte das Backend die verfügbare URL liefern)
        const possibleUrls = ['/api/public/custom-bg.jpg', '/api/public/custom-bg.png', '/api/public/custom-bg.jpeg'];

        for (const url of possibleUrls) {
          const res = await fetch(`${url}?t=${Date.now()}`, { method: 'HEAD' });
          if (res.ok) {
            setBgUrl(`${url}?t=${Date.now()}`);
            break;
          }
        }
      } catch (err) {
        console.error("Fehler beim Prüfen des Hintergrunds", err);
      }
    };
    checkBackground();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type: "guest" })
      });

      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("guest_auth", "true");
      } else {
        setLoginError("Falsches Passwort");
      }
    } catch (err) {
      setLoginError("Verbindungsfehler");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsSuccess(false);

    if (e.target.files && e.target.files.length > 0) {
      const newImages: SelectedImage[] = [];
      const files = Array.from(e.target.files);

      let hasInvalidFile = false;

      files.forEach(file => {
        if (!file.type.startsWith('image/')) {
          hasInvalidFile = true;
          return;
        }

        const url = URL.createObjectURL(file);
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          previewUrl: url,
          rotation: 0
        });
      });

      if (hasInvalidFile) {
        setError("Einige Dateien wurden ignoriert, da es keine Bilder sind.");
      }

      setSelectedImages(prev => [...prev, ...newImages]);

      // Reset input damit das gleiche Bild nochmal gewählt werden kann
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idToRemove: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const rotateImage = (idToRotate: string) => {
    setSelectedImages(prev => prev.map(img => {
      if (img.id === idToRotate) {
        return { ...img, rotation: (img.rotation + 90) % 360 };
      }
      return img;
    }));
  };

  // Hilfsfunktion, um das gedrehte Bild vor dem Upload als neue Datei zu generieren
  const getRotatedFile = async (img: SelectedImage): Promise<File> => {
    if (img.rotation === 0) return img.file;

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(img.file); // Fallback
          return;
        }

        // Canvas Größe anpassen basierend auf Rotation
        if (img.rotation === 90 || img.rotation === 270) {
          canvas.width = image.height;
          canvas.height = image.width;
        } else {
          canvas.width = image.width;
          canvas.height = image.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((img.rotation * Math.PI) / 180);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], img.file.name, {
              type: img.file.type,
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(img.file); // Fallback
          }
        }, img.file.type);
      };
      image.onerror = () => resolve(img.file);
      image.src = img.previewUrl;
    });
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const img of selectedImages) {
        const fileToUpload = await getRotatedFile(img);
        const formData = new FormData();
        formData.append("file", fileToUpload);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload fehlgeschlagen für Datei " + img.file.name);
      }

      setIsSuccess(true);
      // Vorschauen nach kurzer Zeit leeren
      setTimeout(() => {
        setSelectedImages([]);
        setIsSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Hochladen einiger Bilder.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Globaler Hintergrund (Blurred Custom Bg) */}
      {useUploadPageBgImage && bgUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          overflow: "hidden"
        }}>
          <img
            src={bgUrl}
            alt="Upload Background"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: `blur(${uploadBgBlur}px)`,
              transform: `scale(${1 + (uploadBgBlur * 0.01)})`,
              opacity: 0.6
            }}
          />
        </div>
      )}

      {/* Login Overlay */}
      {!isAuthenticated && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div className="glass-panel animate-fade-up" style={{
            maxWidth: "400px",
            width: "100%",
            padding: "40px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)"
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
            <h2 style={{ marginBottom: "20px" }}>{eventName}</h2>
            <p style={{ color: "var(--color-text-light)", marginBottom: "30px", fontSize: "0.95rem" }}>
              {txtSlideshowLoginSub}
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
              {loginError && <p style={{ color: "var(--color-error)", marginBottom: "16px" }}>{loginError}</p>}

              <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                Eintreten
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start", // Geändert von center für langes Scrollen
        padding: "40px 20px",
        pointerEvents: isAuthenticated ? "auto" : "none", // Verhindert Klicks im Hintergrund während des Logins
        filter: isAuthenticated ? "none" : "blur(4px)", // Subtiler Blur auf dem eigentlichen Content
        transition: "filter 0.5s ease"
      }}>
        <div className="glass-panel animate-fade-up" style={{
          maxWidth: "600px",
          width: "100%",
          padding: "40px 30px",
          textAlign: "center"
        }}>

          <div style={{ marginBottom: "30px" }}>
            <h1 style={{ color: "var(--color-primary)", marginBottom: "10px", fontSize: "2.5rem" }}>
              {eventName}
            </h1>
            <p style={{ color: "var(--color-text-light)", fontSize: "1.1rem", whiteSpace: "pre-line" }}>
              {txtUploadTitle}
            </p>
          </div>

          {/* Upload Zone */}
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--color-primary)",
              borderRadius: "16px",
              padding: "40px 20px",
              cursor: isUploading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              background: bgUrl ? `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${bgUrl}) center/cover no-repeat` : "rgba(255, 255, 255, 0.5)",
              marginBottom: "30px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: bgUrl ? "inset 0 0 20px rgba(255,255,255,0.5)" : "none"
            }}
            className="hover-scale"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              style={{ display: "none" }}
            />

            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(212, 175, 55, 0.15)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <Upload size={28} style={{ color: "var(--color-primary)" }} />
            </div>
            <h3 style={{ marginBottom: "8px", textShadow: bgUrl ? "0 0 10px white" : "none" }}>{txtUploadButton}</h3>
            <p style={{ color: "var(--color-text-light)", fontSize: "0.9rem", fontWeight: bgUrl ? 600 : "normal", textShadow: bgUrl ? "0 0 5px white" : "none" }}>
              {txtUploadButtonSub}
            </p>
          </div>

          {/* Erfolgsmeldung */}
          {isSuccess && (
            <div className="animate-fade-up" style={{
              background: "rgba(76, 175, 80, 0.1)",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <CheckCircle size={48} style={{ color: "#4caf50", marginBottom: "10px" }} />
              <h3 style={{ color: "#4caf50" }}>{txtUploadSuccess}</h3>
              <p style={{ color: "var(--color-text-light)", marginTop: "10px" }}>{txtUploadSuccessSub}</p>
            </div>
          )}

          {/* Vorschau-Galerie */}
          {selectedImages.length > 0 && !isSuccess && (
            <div style={{ marginBottom: "30px", textAlign: "left" }}>
              <h3 style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Ausgewählt ({selectedImages.length})
                <span style={{ fontSize: "0.9rem", color: "var(--color-text-light)", fontWeight: "normal" }}>
                  Sie können Bilder noch drehen oder entfernen
                </span>
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "16px"
              }}>
                {selectedImages.map((img) => (
                  <div key={img.id} style={{ position: "relative" }}>
                    <div style={{
                      width: "100%",
                      paddingBottom: "100%",
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#f0f0f0",
                      border: "1px solid var(--glass-border)"
                    }}>
                      <img
                        src={img.previewUrl}
                        alt="Vorschau"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: `rotate(${img.rotation}deg)`,
                          transition: "transform 0.3s ease"
                        }}
                      />
                    </div>

                    {/* Controls */}
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "8px"
                    }}>
                      {/* Rotate Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); rotateImage(img.id); }}
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          backdropFilter: "blur(4px)"
                        }}
                        title="Drehen"
                      >
                        <RotateCw size={16} />
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                        style={{
                          background: "rgba(224, 122, 95, 0.9)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                        }}
                        title="Entfernen"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: "var(--color-error)", marginBottom: "20px", padding: "12px", background: "rgba(224, 122, 95, 0.1)", borderRadius: "8px" }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={selectedImages.length === 0 || isUploading || isSuccess}
            style={{ width: "100%", fontSize: "1.1rem" }}
          >
            {isUploading ? (
              <><Loader2 className="animate-spin" size={20} /> Werden hochgeladen...</>
            ) : isSuccess ? (
              <><CheckCircle size={20} /> Erfolgreich</>
            ) : (
              <><ImageIcon size={20} /> {txtUploadSubmit.replace('{count}', selectedImages.length.toString())}</>
            )}
          </button>

        </div>
      </main>
    </>
  );
}
