import { Capacitor } from "@capacitor/core";

/** Public base for every link people share — always the live domain, never the app's internal address. */
export const PUBLIC_BASE = "https://babycam.io";
export const viewerLink = (roomName: string) => `${PUBLIC_BASE}/viewer/${roomName}`;

const isNative = () => Capacitor.isNativePlatform();

/** Opens an external link/app (WhatsApp, SMS, mail, Messenger) reliably in browser and Android app. */
export function openExternal(url: string) {
  const a = document.createElement("a");
  a.href = url;
  if (/^https?:/.test(url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const whatsappUrl = (text: string, phone?: string) =>
  `https://wa.me/${(phone || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
export const smsUrl = (text: string, phone?: string) => `sms:${phone || ""}?body=${encodeURIComponent(text)}`;
export const mailUrl = (to: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export const telegramUrl = (url: string, text: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
export const facebookUrl = (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
export const messengerUrl = (url: string) =>
  /Android|iPhone|iPad/i.test(navigator.userAgent) ? `fb-messenger://share/?link=${encodeURIComponent(url)}` : facebookUrl(url);

/** Builds a branded PNG (title + QR + link) from a rendered QR canvas. */
export async function brandedQrBlob(qrCanvas: HTMLCanvasElement, title: string, url: string): Promise<Blob> {
  const W = 720, H = 900;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#0a1628"; g.fillRect(0, 0, W, 130);
  g.fillStyle = "#ffffff"; g.font = "bold 44px sans-serif"; g.textAlign = "center";
  g.fillText("BabyCam.io", W / 2, 82);
  g.fillStyle = "#0a1628"; g.font = "bold 34px sans-serif";
  g.fillText(title.slice(0, 32), W / 2, 200);
  g.drawImage(qrCanvas, (W - 520) / 2, 230, 520, 520);
  g.fillStyle = "#475569"; g.font = "24px sans-serif";
  g.fillText("Scan with your phone camera to watch live", W / 2, 800);
  g.font = "20px monospace";
  g.fillText(url.replace(/^https:\/\//, "").slice(0, 52), W / 2, 845);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

const blobToBase64 = (b: Blob) => new Promise<string>((res) => {
  const r = new FileReader();
  r.onloadend = () => res(String(r.result).split(",")[1]);
  r.readAsDataURL(b);
});

export function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/** Shares the QR picture through the phone's share sheet (pick WhatsApp, Messenger, etc). Returns false if it fell back to download. */
export async function shareImage(blob: Blob, fileName: string, text: string, url: string): Promise<boolean> {
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const saved = await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Cache });
    await Share.share({ title: "BabyCam.io", text: `${text}\n${url}`, files: [saved.uri], dialogTitle: "Send QR code" });
    return true;
  }
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text}\n${url}` }); return true; }
    catch (e: any) { if (e?.name === "AbortError") return true; }
  }
  downloadBlob(blob, fileName);
  return false;
}

/** Phone's own share sheet for the link (all installed apps). */
export async function shareLink(title: string, text: string, url: string): Promise<boolean> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: "Share camera" });
    return true;
  }
  if (typeof navigator.share === "function") {
    try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    return true;
  }
  return false;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return ok;
  }
}
