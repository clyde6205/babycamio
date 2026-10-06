import { Capacitor } from "@capacitor/core";

/** Public base for every link people share — always the live domain, never the app's internal address. */
export const PUBLIC_BASE = "https://babycam.io";
export const viewerLink = (roomName: string) => `${PUBLIC_BASE}/viewer/${roomName}`;

export const isNative = () => Capacitor.isNativePlatform();

/** Opens an external link/app (WhatsApp, SMS, mail, Messenger) reliably in browser and Android app. */
export function openExternal(url: string) {
  if (isNative()) {
    // Inside the Android app the WebView hands any non-app URL / scheme to Android, which opens WhatsApp, SMS, etc.
    window.location.href = url;
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  if (/^https?:/.test(url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const whatsappUrl = (text: string, phone?: string) =>
  `https://wa.me/${(phone || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
export const smsUrl = (text: string, phone?: string) => `sms:${(phone || "").replace(/[^\d+]/g, "")}?body=${encodeURIComponent(text)}`;
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

const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onloadend = () => res(String(r.result).split(",")[1]);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(-120) || `babycam-${Date.now()}`;

/** Browser download of a blob (real file, not a link). */
export function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60_000);
}

/** Writes a blob into the Android app cache and returns its file URI (for sharing). */
async function writeCache(blob: Blob, fileName: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const r = await Filesystem.writeFile({ path: safeName(fileName), data: await blobToBase64(blob), directory: Directory.Cache });
  return r.uri;
}

export interface SaveResult { ok: boolean; where: string }

/**
 * Saves a real file onto the device.
 * Android app: Documents/BabyCam (visible in the Files app). Falls back to the share menu ("Save to Files / Drive").
 * Browser: regular file download into the Downloads folder.
 */
export async function saveFile(blob: Blob, fileName: string): Promise<SaveResult> {
  const name = safeName(fileName);
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      try { await Filesystem.requestPermissions(); } catch { /* not needed on newer Android */ }
      await Filesystem.writeFile({ path: `BabyCam/${name}`, data: await blobToBase64(blob), directory: Directory.Documents, recursive: true });
      return { ok: true, where: `Documents › BabyCam › ${name}` };
    } catch {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: name, files: [await writeCache(blob, name)], dialogTitle: "Save or send file" });
        return { ok: true, where: "the app you picked" };
      } catch (e: any) {
        if (/cancel/i.test(String(e?.message))) return { ok: false, where: "" };
        throw e;
      }
    }
  }
  downloadBlob(blob, name);
  return { ok: true, where: "your Downloads folder" };
}

/** Fetches a remote file (e.g. a cloud recording) and saves it as a real file on the device. */
export async function downloadFromUrl(url: string, fileName: string): Promise<SaveResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return saveFile(await res.blob(), fileName);
}

/** Sends the actual file (picture / video) through the phone's share menu — WhatsApp, Messenger, Gmail, Drive… Returns false if it fell back to download. */
export async function shareFile(blob: Blob, fileName: string, text = ""): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "BabyCam.io", text: text || undefined, files: [await writeCache(blob, fileName)], dialogTitle: "Send with" });
      return true;
    } catch (e: any) {
      if (/cancel/i.test(String(e?.message))) return true;
      await saveFile(blob, fileName);
      return false;
    }
  }
  const file = new File([blob], safeName(fileName), { type: blob.type || "application/octet-stream" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: text || undefined }); return true; }
    catch (e: any) { if (e?.name === "AbortError") return true; }
  }
  downloadBlob(blob, safeName(fileName));
  return false;
}

/** Shares the QR picture through the phone's share sheet. Returns false if it fell back to download. */
export const shareImage = (blob: Blob, fileName: string, text: string, url: string) => shareFile(blob, fileName, `${text}\n${url}`);

/** Phone's own share sheet for the link (all installed apps). */
export async function shareLink(title: string, text: string, url: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: "Share with" });
      return true;
    } catch (e: any) {
      if (/cancel/i.test(String(e?.message))) return true;
      openExternal(whatsappUrl(`${text}\n${url}`));
      return true;
    }
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
