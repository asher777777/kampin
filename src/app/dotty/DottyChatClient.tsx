"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./dotty.module.css";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  ShieldAlert,
  Zap,
  Plus,
  Play,
  Info,
  Camera,
  Check,
  Sparkles,
  Folder,
  Activity,
  Bug,
  Users,
  AlertCircle,
  Video,
  Volume2
} from "lucide-react";

const AgentCardUI = ({
  ui,
  onAction,
}: {
  ui: any;
  onAction: (text: string) => void;
}) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/employee?id=${ui.data.employeeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.mediaData) setMediaUrl(data.mediaData);
      })
      .catch(console.error);
  }, [ui.data.employeeId]);

  const slug = ui.data.employeeId.split("_").slice(1).join("_");
  const officeSlug = ui.data.employeeId.split("_")[0];
  const url = `/office/${officeSlug}/employee/${slug}`;

  return (
    <div
      className={styles.menuCard}
      onClick={() => (window.location.href = url)}
      style={{ cursor: "pointer", overflow: "hidden" }}
    >
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={ui.data.name}
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
            borderRadius: "8px 8px 0 0",
          }}
        />
      ) : (
        <div className={styles.menuIcon}>🤖</div>
      )}
      <div style={{ padding: "10px" }}>
        <h4 className={styles.menuTitle}>{ui.data.name}</h4>
        <p className={styles.menuDesc}>{ui.data.role}</p>
        <div
          style={{
            textAlign: "center",
            color: "#f59e0b",
            fontWeight: "bold",
            marginTop: "8px",
          }}
        >
          Open Smart Employee ➔
        </div>
      </div>
    </div>
  );
};

const MediaUploadCard = ({
  title,
  assetType,
  onAction,
}: {
  title?: string;
  assetType?: string;
  onAction: (text: string, mediaData: string) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [driveLink, setDriveLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // If file is > 2MB, use a signed URL to upload directly to GCS
        try {
          setIsUploading(true);
          setProgress(10); // Indicate starting
          
          // 1. Get Signed URL from our backend
          const res = await fetch("/api/upload-url", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ fileName: file.name, contentType: file.type })
          });
          
          if (!res.ok) throw new Error("Failed to get upload URL");
          
          const { uploadUrl, downloadUrl } = await res.json();
          setProgress(30);

          // 2. Upload file directly to GCS using the Signed URL
          // Note: fetch doesn't support upload progress naturally, so we just set to 50% during upload
          setProgress(50);
          const uploadRes = await fetch(uploadUrl, {
             method: "PUT",
             body: file,
             headers: { "Content-Type": file.type }
          });

          if (!uploadRes.ok) throw new Error("Failed to upload file to Cloud Storage");
          
          setProgress(100);
          setIsUploading(false);
          onAction(`[UPLOAD_ASSET] ${assetType || "media"}`, downloadUrl);
        } catch (err) {
          console.error("Signed URL upload failed", err);
          setIsUploading(false);
          alert("העלאה נכשלה, נסה להדביק קישור מגוגל דרייב");
        }
      } else {
        // Fallback for small files (images)
        const reader = new FileReader();
        reader.onloadend = () => {
          onAction(`[UPLOAD_ASSET] ${assetType || "media"}`, reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDriveSubmit = () => {
    if (!driveLink) return;
    let finalUrl = driveLink;
    // Extract ID and convert to direct streamable link if it's a Drive link
    const driveMatch = driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      finalUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    } else {
      const idMatch = driveLink.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        finalUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
      }
    }
    // Must include an extension hint so our backend knows it's a video if needed, though drive links are opaque.
    // The backend uses startsWith('data:video') or includes('.mp4') to know if it's video.
    // Let's add a fake hash to help it:
    if (assetType?.toLowerCase().includes("video")) {
      finalUrl += "#.mp4"; 
    }
    onAction(`[UPLOAD_ASSET] ${assetType || "media"}`, finalUrl);
  };

  const isVideo = assetType?.toLowerCase().includes("video");
  const Icon = isVideo ? Video : Camera;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(10,10,10,0.6)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
      {title && <h3 style={{ color: "#D4AF37", marginBottom: "15px", fontSize: "1.1rem" }}>{title}</h3>}
      
      {/* Upload Area */}
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          border: "1px dashed rgba(212, 175, 55, 0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: isUploading ? "wait" : "pointer",
          background: "rgba(10, 10, 10, 0.4)",
          boxShadow: "0 0 15px rgba(212, 175, 55, 0.05)",
          transition: "all 0.3s ease",
          marginBottom: "15px"
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept={isVideo ? "video/*" : "image/*"}
          onChange={handleFileChange}
        />
        {isUploading ? (
          <div style={{ color: "#D4AF37", fontWeight: "bold" }}>{progress}%</div>
        ) : (
          <Icon size={32} color="#D4AF37" strokeWidth={1.5} />
        )}
      </div>

      <div style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "10px" }}>או הדבק קישור מגוגל דרייב:</div>
      <div style={{ display: "flex", width: "100%", gap: "8px" }}>
        <input 
          type="text" 
          placeholder="https://drive.google.com/..." 
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
        />
        <button 
          onClick={handleDriveSubmit}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#D4AF37", color: "#000", fontWeight: "bold", cursor: "pointer" }}
        >
          שמור
        </button>
      </div>
    </div>
  );
};

const AgentBuilderForm = ({
  onAction,
}: {
  onAction: (text: string, tools: string[]) => void;
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");

  const [tools, setTools] = useState({
    crm: false,
    payments: false,
    forms: false,
    contentCreation: false,
    displayAgent: false,
  });

  const [step, setStep] = useState(0);

  const handleNext = () => setStep(s => s + 1);

  const handleSubmit = () => {
    const selectedTools = Object.entries(tools).filter(([_, v]) => v).map(([k]) => k);
    onAction(`Create a smart employee named ${name}, role: ${role}. Goal: ${goal}. Tone: ${tone}. Tools: ${selectedTools.join(", ")}`, selectedTools);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h4 style={{ color: "white", fontWeight: 300 }}>מה שם העובד החדש?</h4>
            <input
              autoFocus
              placeholder="שם (לדוגמה: דן)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name && handleNext()}
              style={{
                background: "transparent", border: "none", borderBottom: "1px solid #D4AF37",
                color: "white", padding: "10px", fontSize: "18px", textAlign: "center", outline: "none", width: "100%"
              }}
            />
            {name && (
              <div onClick={handleNext} style={nextBtnStyle}>
                <Folder size={24} color="#070D1D" />
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h4 style={{ color: "white", fontWeight: 300 }}>מה תפקידו?</h4>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {["מכירות", "תמיכה", "שירות לקוחות", "הדרכה"].map(r => (
                <div key={r} onClick={() => { setRole(r); handleNext(); }} style={chipStyle(role === r)}>
                  {r}
                </div>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h4 style={{ color: "white", fontWeight: 300 }}>מה מטרת העל שלו?</h4>
            <input
              autoFocus
              placeholder="לדוגמה: לקבוע פגישות"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goal && handleNext()}
              style={{
                background: "transparent", border: "none", borderBottom: "1px solid #D4AF37",
                color: "white", padding: "10px", fontSize: "18px", textAlign: "center", outline: "none", width: "100%"
              }}
            />
            {goal && (
              <div onClick={handleNext} style={nextBtnStyle}>
                <Folder size={24} color="#070D1D" />
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h4 style={{ color: "white", fontWeight: 300 }}>באיזה טון הוא ידבר?</h4>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {["מקצועי", "ידידותי", "אסרטיבי", "אמפתי"].map(t => (
                <div key={t} onClick={() => { setTone(t); handleNext(); }} style={chipStyle(tone === t)}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h4 style={{ color: "white", fontWeight: 300 }}>אילו כלים להפעיל? (אפשר לבחור כמה)</h4>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginBottom: "15px" }}>
              {Object.entries(tools).map(([key, val]) => (
                <div key={key} onClick={() => setTools({ ...tools, [key]: !val })} style={chipStyle(val)}>
                  {val && <Check size={14} />}
                  {key === "crm" ? "CRM" : key === "payments" ? "תשלומים" : key === "forms" ? "טפסים" : key === "contentCreation" ? "תוכן" : "הצגת סוכן"}
                </div>
              ))}
            </div>
            <div onClick={handleSubmit} style={nextBtnStyle}>
              <Folder size={24} color="#070D1D" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const nextBtnStyle = {
    width: "45px", height: "45px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "linear-gradient(135deg, #D4AF37 0%, #aa8529 100%)", boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
    transition: "transform 0.2s"
  };

  const chipStyle = (isActive: boolean) => ({
    padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.3s",
    border: isActive ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.2)",
    color: isActive ? "#D4AF37" : "#aaa",
    background: isActive ? "rgba(212, 175, 55, 0.1)" : "transparent",
  });

  return (
    <div className={styles.miniForm} style={{ textAlign: "center", border: "1px solid rgba(212, 175, 55, 0.3)", background: "rgba(10,10,10,0.6)", minHeight: "200px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {renderStep()}
    </div>
  );
};

function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;

    const words = text.split(" ");
    let current = 0;

    const interval = setInterval(() => {
      if (current < words.length) {
        setDisplayed(words.slice(0, current + 1).join(" "));
        current++;
      } else {
        clearInterval(interval);
      }
    }, 200); // ~300 words per minute, roughly matching speech

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}</>;
}

function InteractiveMiniForm({
  ui,
  onAction,
}: {
  ui: any;
  onAction: (text: string) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className={styles.miniForm}>
      <h3 className={styles.formTitle}>{ui.data.title}</h3>
      {ui.data.fields.map((f: string, i: number) => (
        <input
          key={i}
          type="text"
          placeholder={f}
          className={styles.formInput}
          value={formData[f] || ""}
          onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}
        />
      ))}
      <button
        disabled={isSubmitting}
        onClick={async () => {
          setIsSubmitting(true);
          const details = Object.entries(formData)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");

          const phone = formData["Phone"] || formData["טלפון"];
          if (phone) {
            try {
              const { signIn } = await import("next-auth/react");
              // Background auto-registration/login using phone number
              await signIn("credentials", {
                username: phone,
                password: phone,
                action: "register",
                redirect: false,
              });
            } catch (e) {
              console.error("Auto-login failed:", e);
            }
          }

          onAction(`השארתי פרטים. הנה הפרטים שלי: ${details}`);
          setIsSubmitting(false);
        }}
        className={styles.productBtn}
      >
        {isSubmitting ? "שולח..." : "שלח"}
      </button>
    </div>
  );
}

function PromoCard({ ui }: { ui: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div style={{ width: "100%", maxWidth: "320px", background: "linear-gradient(145deg, #111, #222)", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(212, 175, 55, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.7)", textAlign: "center", marginTop: "15px" }}>
      {!isPlaying ? (
        <>
          <div style={{ position: "relative" }}>
            <img src={ui.data.profilePicture} style={{ width: "100%", height: "240px", objectFit: "cover", borderBottom: "3px solid #D4AF37" }} alt={ui.data.name} />
            <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.7)", padding: "4px 12px", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.5)", color: "#D4AF37", fontSize: "0.8rem", fontWeight: "bold" }}>
              {ui.data.role || "נציג/ה"}
            </div>
          </div>
          <div style={{ padding: "15px" }}>
            <h3 style={{ color: "#fff", fontSize: "1.4rem", margin: "0 0 15px 0" }}>{ui.data.name}</h3>
            {ui.data.videoUrl && (
              <button 
                onClick={() => setIsPlaying(true)}
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #aa8529 100%)", color: "#000", border: "none", padding: "10px 24px", borderRadius: "24px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <Play size={18} />
                צפה בסרטון
              </button>
            )}
          </div>
        </>
      ) : (
        <video src={ui.data.videoUrl} controls autoPlay playsInline style={{ width: "100%", display: "block", maxHeight: "400px" }} />
      )}
    </div>
  );
}

function InteractiveMultiSelect({
  ui,
  onAction,
}: {
  ui: any;
  onAction: (text: string) => void;
}) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = (title: string) => {
    if (selectedItems.includes(title)) {
      setSelectedItems(selectedItems.filter((i) => i !== title));
    } else {
      setSelectedItems([...selectedItems, title]);
    }
  };

  const nextBtnStyle = {
    width: "45px", height: "45px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "linear-gradient(135deg, #D4AF37 0%, #aa8529 100%)", boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
    transition: "transform 0.2s", margin: "20px auto 0"
  };

  const chipStyle = (isActive: boolean) => ({
    padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.3s",
    border: isActive ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.2)",
    color: isActive ? "#D4AF37" : "#aaa",
    background: isActive ? "rgba(212, 175, 55, 0.1)" : "transparent",
  });

  return (
    <div style={{ textAlign: "center", border: "1px solid rgba(212, 175, 55, 0.3)", background: "rgba(10,10,10,0.6)", padding: "20px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h3 style={{ color: "#D4AF37", marginBottom: "20px", fontSize: "1.2rem" }}>{ui.data.title || "בחר את הכלים המתאימים:"}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
        {ui.data.items.map((item: any, i: number) => {
          const isActive = selectedItems.includes(item.title);
          return (
            <div key={i} onClick={() => toggleItem(item.title)} style={chipStyle(isActive)}>
              {isActive && <Check size={14} />}
              {item.title}
            </div>
          );
        })}
      </div>
      <div onClick={() => onAction(selectedItems.length > 0 ? selectedItems.join(", ") : "אין כלים")} style={nextBtnStyle}>
        <Folder size={24} color="#070D1D" />
      </div>
    </div>
  );
}

function InsightCard({ ui, onAction }: { ui: any; onAction: (text: string) => void }) {
  const data = ui.data;
  const IconCmp = data.icon === "Users" ? Users : data.icon === "AlertCircle" ? AlertCircle : data.icon === "Activity" ? Activity : data.icon === "Bug" ? Bug : Info;

  return (
    <div style={{ 
      width: "auto", maxWidth: "400px", margin: "0 auto", padding: "12px 24px", 
      background: "rgba(15, 15, 15, 0.8)", border: "1px solid rgba(212, 175, 55, 0.3)", 
      borderRadius: "30px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "row", alignItems: "center", gap: "12px",
      backdropFilter: "blur(8px)"
    }}>
      <div style={{ color: data.color || "#D4AF37", display: "flex" }}>
        <IconCmp size={20} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
        <h2 style={{ fontSize: "0.95rem", margin: "0 0 2px 0", fontWeight: "600", color: "#f8fafc" }}>{data.title}</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>{data.text}</p>
      </div>
    </div>
  );
}

const GenerativeRenderer = ({
  ui,
  onAction,
}: {
  ui: any;
  onAction: (text: string, media?: string) => void;
}) => {
  if (ui.type === "ProductCard") {
    return (
      <div className={styles.productCard}>
        <div className={styles.productIcon} style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <Sparkles size={28} color="#D4AF37" strokeWidth={1.5} />
        </div>
        <h3 className={styles.productName}>{ui.data.name}</h3>
        <p className={styles.productDesc}>{ui.data.desc}</p>
        <div className={styles.productPrice}>{ui.data.price}</div>
        <button
          onClick={() => onAction(`I am interested in ${ui.data.name}`)}
          className={styles.productBtn}
        >
          מעניין אותי
        </button>
      </div>
    );
  }

  if (ui.type === "Carousel") {
    return (
      <div className={styles.carouselContainer}>
        {ui.data.items.map((item: any, i: number) => (
          <div key={i} className={styles.carouselItem}>
            <h4 className={styles.carouselItemName}>{item.name}</h4>
            <p className={styles.carouselItemDesc}>{item.desc}</p>
            <div className={styles.carouselItemPrice}>{item.price}</div>
            <button
              onClick={() => onAction(`I want ${item.name}`)}
              className={styles.productBtn}
            >
              בחר
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (ui.type === "AgentCard") {
    return <AgentCardUI ui={ui} onAction={onAction} />;
  }

  if (ui.type === "AgentBuilderForm") {
    return <AgentBuilderForm onAction={(text) => onAction(text)} />;
  }

  if (ui.type === "MediaUploadCard") {
    return (
      <MediaUploadCard
        title={ui.data?.title}
        assetType={ui.data?.assetType}
        onAction={(text, media) => onAction(text, media)}
      />
    );
  }

  if (ui.type === "MiniForm") {
    return <InteractiveMiniForm ui={ui} onAction={onAction} />;
  }

  if (ui.type === "PaymentDialog") {
    return (
      <div className={styles.miniForm}>
        <h3 className={styles.formTitle}>Secure Checkout</h3>
        <p className={styles.productDesc}>
          Purchasing: <strong>{ui.data.product}</strong>
        </p>
        <div className={styles.productPrice}>{ui.data.amount}</div>
        <button
          onClick={() => onAction(`שילמתי בהצלחה על ${ui.data.product}`)}
          className={styles.productBtn}
        >
          Pay Now (Mock)
        </button>
      </div>
    );
  }

  if (ui.type === "MenuGrid") {
    return (
      <div className={styles.menuGrid}>
        {ui.data.items.map((item: any, i: number) => (
          <div
            key={i}
            className={styles.menuCard}
            onClick={() => onAction(item.action)}
          >
            <div className={styles.menuIcon}>{item.icon}</div>
            <h4 className={styles.menuTitle}>{item.title}</h4>
            <p className={styles.menuDesc}>{item.desc}</p>
          </div>
        ))}
      </div>
    );
  }

  if (ui.type === "MultiSelectGrid") {
    return <InteractiveMultiSelect ui={ui} onAction={onAction} />;
  }

  if (ui.type === "MissingAssetsLobby") {
    return (
      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ color: "#f59e0b", marginBottom: "1rem" }}>
          הסוכנים הבאים ממתינים להשלמת נכסי המדיה שלהם (סרטונים ותמונות):
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          {ui.data?.agents?.map((ag: any, idx: number) => (
            <div
              key={idx}
              className={styles.menuCard}
              onClick={() => onAction(`אני רוצה להשלים את ההגדרות של הסוכן ${ag.name} (${ag.id})`)}
            >
              <h4 className={styles.menuTitle}>{ag.name}</h4>
              <p className={styles.menuDesc}>לחץ להשלמת פרופיל</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (ui.type === "InsightCard") {
    return <InsightCard ui={ui} onAction={onAction} />;
  }


  if (ui.type === "PromoCard") {
    return <PromoCard ui={ui} />;
  }

  if (ui.type === "VideoPlayerCard") {
    return (
      <div style={{ width: "100%", maxWidth: "400px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(212, 175, 55, 0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", marginTop: "15px", background: "#000" }}>
        {ui.data.isVideo !== false ? (
          <video src={ui.data.url} controls autoPlay playsInline style={{ width: "100%", display: "block" }} />
        ) : (
          <img src={ui.data.url} alt="Agent Asset" style={{ width: "100%", display: "block" }} />
        )}
      </div>
    );
  }

  if (ui.type === "ImageCard") {
    return (
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <img
          src={ui.data.url}
          alt={ui.data.prompt}
          style={{
            maxWidth: "100%",
            borderRadius: "12px",
            border: "2px solid #f59e0b",
            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.2)",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#999",
            marginTop: "8px",
            fontStyle: "italic",
          }}
        >
          {ui.data.prompt}
        </p>
      </div>
    );
  }

  if (ui.type === "Redirect") {
    if (typeof window !== "undefined") {
      window.location.href = ui.data.url;
    }
    return <div className={styles.productDesc}>מעביר אותך למשרד החדש...</div>;
  }

  return null;
}

export default function DottyChatClient({
  userRole,
  userId,
  officeSlug,
  agentId,
  agentName,
  missingAssetsAgents,
}: {
  userRole?: "MASTER_ADMIN" | "MANAGER" | "END_USER";
  userId: string | null;
  officeSlug?: string;
  agentId?: string;
  agentName?: string;
  missingAssetsAgents?: any[];
}) {
  const isAdmin = userRole === "MASTER_ADMIN" || userRole === "MANAGER";
  const [message, setMessage] = useState("");
  const [generativeUI, setGenerativeUI] = useState<any[]>([]);

  const [userText, setUserText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isInfoMode, setIsInfoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sessionId, setSessionId] = useState("");
  const [interactionId, setInteractionId] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      fetch(`/api/employee?id=${agentId}`)
        .then((r) => r.json())
        .then((data) => {
          setAgentData(data);
          if (!data.introVideo) {
            setIsIntroPlaying(false);
          }
        })
        .catch(console.error);
    }
  }, [agentId]);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedMedia(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKeyPrefix = `agent_session_${agentId || officeSlug || "default"}`;
      const sessionKey = `${storageKeyPrefix}_id`;
      const interactionKey = `${storageKeyPrefix}_interaction_id`;

      let savedSession = localStorage.getItem(sessionKey);
      if (!savedSession) {
        savedSession = `dotty_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem(sessionKey, savedSession);
      }
      setSessionId(savedSession);
      
      let savedInteraction = localStorage.getItem(interactionKey);
      if (savedInteraction) {
        setInteractionId(savedInteraction);
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "he-IL";

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setUserText(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Run once on mount

  // Trigger init greeting once session is ready and user interacted
  useEffect(() => {
      if (isStarted && sessionId && !hasInteracted && message === "") {
          handleSend(`[INIT_GREETING] ${missingAssetsAgents?.length || 0}`);
      }
  }, [sessionId, hasInteracted, message, missingAssetsAgents, isStarted]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSend = async (overrideText?: string, mediaOverride?: string) => {
    const textToSend = overrideText || userText.trim();
    const mediaToSend = mediaOverride || selectedMedia;

    if (!textToSend && !mediaToSend) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setIsThinking(true);
    setHasInteracted(true);
    setMessage("");
    setGenerativeUI([]);

    if (!overrideText) {
      setUserText("");
    }

    try {
      const res = await fetch("/api/dotty-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: textToSend,
          sessionId,
          previous_interaction_id: interactionId,
          userRole,
          userId,
          officeSlug,
          agentId,
          isInfoMode,
          mediaData: mediaToSend,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API error response:", text);
        setMessage("היי, חוויתי לרגע קטיעה קלה בתקשורת. אני כאן, אפשר לנסות שוב בעוד כמה שניות!");
        return;
      }

      const data = await res.json();

      if (data.reply) {
        let rawReply = data.reply;

        // Parse [UI_COMPONENT: ...]
        const foundUIs: any[] = [];
        const uiParts = rawReply.split(/\[UI_COMPONENT:/);

        if (uiParts.length > 1) {
          for (let i = 1; i < uiParts.length; i++) {
            const part = uiParts[i];
            const startIdx = part.indexOf("{");
            if (startIdx !== -1) {
              let depth = 0;
              let endIdx = -1;
              for (let j = startIdx; j < part.length; j++) {
                if (part[j] === "{") depth++;
                else if (part[j] === "}") {
                  depth--;
                  if (depth === 0) {
                    endIdx = j;
                    break;
                  }
                }
              }

              if (endIdx !== -1) {
                const jsonStr = part.substring(startIdx, endIdx + 1);
                try {
                  foundUIs.push(JSON.parse(jsonStr));
                } catch (e) {
                  try {
                    foundUIs.push(new Function("return " + jsonStr)());
                  } catch (err) {
                    console.error(
                      "Failed to parse extracted UI component JSON:",
                      err,
                    );
                  }
                }
              }
            }
          }
        }

        const cleanReply = rawReply
          .replace(/\[CARD:([\s\S]*?)\]/g, "")
          .replace(/\[UI_COMPONENT:[\s\S]*/, "")
          .trim();

        setMessage(cleanReply);
        setGenerativeUI(foundUIs);
        setSelectedMedia(null); // clear media after send

        const storageKeyPrefix = `agent_session_${agentId || officeSlug || "default"}`;
        const sessionKey = `${storageKeyPrefix}_id`;
        const interactionKey = `${storageKeyPrefix}_interaction_id`;

        if (data.sessionId) {
          setSessionId(data.sessionId);
          if (typeof window !== "undefined") localStorage.setItem(sessionKey, data.sessionId);
        }

        if (data.interactionId) {
          setInteractionId(data.interactionId);
          if (typeof window !== "undefined") localStorage.setItem(interactionKey, data.interactionId);
        }

        if (data.audioBase64) {
          setLastAudioBase64(data.audioBase64);
          try {
            const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
            audio.onplay = () => setIsPlaying(true);
            audio.onended = () => {
              setIsPlaying(false);
              setMessage(""); // Hide subtitles when audio finishes
            };
            audio.onerror = () => setIsPlaying(false);
            
            audio
              .play()
              .catch((e) => {
                console.error("Audio playback blocked by browser:", e);
                setIsPlaying(false);
              });
          } catch (err) {
            console.error("Audio play error", err);
          }
        } else {
          // If no audio returned, clear text after 5 seconds
          setTimeout(() => setMessage(""), 5000);
        }
      } else {
        setMessage("היי, הייתה לי שניה קטיעה קלה מול השרת, אבל אני לגמרי איתך. אפשר לשלוח את ההודעה שוב?");
      }
    } catch (err) {
      console.error(err);
      setMessage("היי, החיבור התחדש כעת. אפשר לחזור על הבקשה ואני מיד מטפלת בה!");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div
      className={`${styles.container} ${isAdmin ? styles.adminMode : styles.clientMode}`}
      dir="rtl"
      lang="he"
    >
      {!isStarted && agentData && (
        <div 
          onClick={() => {
            setIsStarted(true);
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.error("Play failed:", e));
            }
          }}
          style={{ position: "absolute", zIndex: 9999, top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(5px)" }}
        >
           <div style={{ padding: "20px", background: "linear-gradient(135deg, #D4AF37 0%, #aa8529 100%)", borderRadius: "50%", boxShadow: "0 4px 30px rgba(212,175,55,0.4)" }}>
              <Play size={48} color="#000" />
           </div>
           <p style={{ color: "#D4AF37", marginTop: "20px", fontSize: "1.2rem", fontWeight: "bold" }}>הקש/י להתחלה</p>
        </div>
      )}

      {agentData && (agentData.idleVideo || agentData.speakingVideo || agentData.introVideo || agentData.noddingVideo) && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video
            ref={videoRef}
            src={
              isIntroPlaying && agentData.introVideo ? agentData.introVideo :
              isPlaying && agentData.speakingVideo ? agentData.speakingVideo :
              (isRecording || isThinking) && agentData.noddingVideo ? agentData.noddingVideo :
              (agentData.idleVideo || agentData.speakingVideo)
            }
            autoPlay={!isIntroPlaying || isStarted}
            loop={!isIntroPlaying}
            muted={!isIntroPlaying}
            playsInline
            onEnded={() => {
              if (isIntroPlaying) {
                setIsIntroPlaying(false);
              }
            }}
            style={{ minWidth: "100%", minHeight: "100%", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </div>
      )}

      <div className={styles.topBar} style={{ zIndex: 2, position: "relative" }}>
        {isAdmin ? (
          <div className={styles.headerCenterGroup}>
            <button
              className={`${styles.zapButton} ${isInfoMode ? styles.activeInfo : ""}`}
              onClick={() => setIsInfoMode(!isInfoMode)}
            >
              <Info size={24} />
            </button>
            <div className={styles.goldenLogo}>MY LOGO</div>
            <button
              className={styles.zapButton}
              onClick={() => alert("Quick Actions Modal coming soon")}
            >
              <Zap size={24} />
            </button>
          </div>
        ) : (
          <div className={styles.modeIndicator}>Guest Lobby</div>
        )}
      </div>

      <div className={styles.chatOverlay} style={{ zIndex: 2, position: "relative", background: agentData ? "transparent" : undefined }}>
        <div className={styles.spacer} />

        <div className={styles.messageWrapper}>
          {message && (
            <div className={styles.messageContainer} style={agentData ? {
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(212, 175, 55, 0.4)",
              borderRadius: "16px",
              padding: "1rem 2rem",
              backdropFilter: "blur(4px)",
              color: "#fff"
            } : {}}>
              {isThinking ? (
                <Loader2
                  className={`animate-spin w-10 h-10 mx-auto ${isAdmin ? "text-white" : "text-slate-800"}`}
                />
              ) : (
                <Typewriter text={message} />
              )}
              {agentData && !isPlaying && lastAudioBase64 && !isThinking && (
                <button
                  onClick={() => {
                    const snd = new Audio(`data:audio/mp3;base64,${lastAudioBase64}`);
                    setIsPlaying(true);
                    snd.play();
                    snd.onended = () => setIsPlaying(false);
                  }}
                  style={{
                    display: "block",
                    margin: "10px auto 0",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#D4AF37",
                  }}
                  title="השמע שוב"
                >
                  <Volume2 size={24} />
                </button>
              )}
            </div>
          )}

          {isThinking && !message && (
             <div className={styles.messageContainer}>
                <Loader2
                  className={`animate-spin w-10 h-10 mx-auto ${isAdmin ? "text-white" : "text-slate-800"}`}
                />
             </div>
          )}

          {generativeUI.length > 0 && (
            <div className={styles.generativeContainer}>
              {generativeUI.map((ui, idx) => (
                <GenerativeRenderer key={idx} ui={ui.type === "MissingAssetsLobby" ? { ...ui, data: { agents: missingAssetsAgents } } : ui} onAction={handleSend} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.spacer} />

        <div className={styles.controlsContainer}>
          {selectedMedia && (
            <div style={{ marginBottom: "1rem", position: "relative" }}>
              <img
                src={selectedMedia}
                alt="Upload preview"
                style={{ maxHeight: "100px", borderRadius: "8px" }}
              />
              <button
                onClick={() => setSelectedMedia(null)}
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "-10px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  width: "24px",
                  height: "24px",
                }}
              >
                ✕
              </button>
            </div>
          )}
          <div className={styles.inputGroup}>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder=""
              className={styles.textInput}
              disabled={isThinking}
              rows={2}
              style={{ textAlign: "center" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          <div className={styles.goldenControls}>
            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {userText.trim().length > 0 || selectedMedia ? (
              <button
                className={`${styles.goldBtn} ${styles.goldBtnCircle}`}
                onClick={() => handleSend()}
                disabled={isThinking}
              >
                <Play size={28} fill="black" />
              </button>
            ) : isPlaying ? (
              <button
                className={`${styles.goldBtn} ${styles.goldBtnCircle}`}
                onClick={() => {}}
                disabled={true}
                title="Playing Audio..."
              >
                <span className="flex items-center justify-center animate-pulse">
                  <div className="w-4 h-4 bg-black rounded-full" />
                </span>
              </button>
            ) : (
              <button
                className={`${styles.goldBtn} ${styles.goldBtnSquare} ${!isRecording ? styles.pulseMic : ""}`}
                onClick={toggleRecording}
                style={isRecording ? { background: "#ef4444" } : {}}
              >
                {isRecording ? (
                  <MicOff size={28} color="white" />
                ) : (
                  <Mic size={28} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
