import { Capacitor } from "@capacitor/core";

/** Public base for every link people share — always the live domain, never the app's internal address. */
export const PUBLIC_BASE = "https://babycam.io";
/** roomKey must be the room UUID for anonymous/private viewer access. */
export const viewerLink = (roomKey: string) => `${PUBLIC_BASE}/viewer/${encodeURIComponent(roomKey)}`;

export const isNative = () => Capacitor.isNativePlatform();

/** Opens an external link/app (WhatsApp, SMS, mail, Messenger) reliably in browser and Android app. */
export function openExternal(url: string) {
  if (isNative()) {
    window.location.href = url;
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  if (/^https?:/.test(url)) { anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
  const width = 720;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0a1628";
  context.fillRect(0, 0, width, 130);
  context.fillStyle = "#ffffff";
  context.font = "bold 44px sans-serif";
  context.textAlign = "center";
  context.fillText("BabyCam.io", width / 2, 82);
  context.fillStyle = "#0a1628";
  context.font = "bold 34px sans-serif";
  context.fillText(title.slice(0, 32), width / 2, 200);
  context.drawImage(qrCanvas, (width - 520) / 2, 230, 520, 520);
  context.fillStyle = "#475569";
  context.font = "24px sans-serif";
  context.fillText("Scan with your phone camera to watch live", width / 2, 800);
  context.font = "20px monospace";
  context.fillText(url.replace(/^https:\/\//, "").slice(0, 52), width / 2, 845);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-120) || `babycam-${Date.now()}`;

/** Browser download of a blob (real file, not a link). */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Writes a blob into the Android app cache and returns its file URI (for sharing). */
async function writeCache(blob: Blob, fileName: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const result = await Filesystem.writeFile({ path: safeName(fileName), data: await blobToBase64(blob), directory: Directory.Cache });
  return result.uri;
}

export interface SaveResult { ok: boolean; where: string }

/** Saves a real file onto the device. */
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
      } catch (error: any) {
        if (/cancel/i.test(String(error?.message))) return { ok: false, where: "" };
        throw error;
      }
    }
  }
  downloadBlob(blob, name);
  return { ok: true, where: "your Downloads folder" };
}

/** Fetches a remote file and saves it as a real file on the device. */
export async function downloadFromUrl(url: string, fileName: string): Promise<SaveResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  return saveFile(await response.blob(), fileName);
}

/** Sends the actual file through the phone's share menu. Returns false if it fell back to download. */
export async function shareFile(blob: Blob, fileName: string, text = ""): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "BabyCam.io", text: text || undefined, files: [await writeCache(blob, fileName)], dialogTitle: "Send with" });
      return true;
    } catch (error: any) {
      if (/cancel/i.test(String(error?.message))) return true;
      await saveFile(blob, fileName);
      return false;
    }
  }
  const file = new File([blob], safeName(fileName), { type: blob.type || "application/octet-stream" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: text || undefined }); return true; }
    catch (error: any) { if (error?.name === "AbortError") return true; }
  }
  downloadBlob(blob, safeName(fileName));
  return false;
}

/** Shares the QR picture through the phone's share sheet. */
export const shareImage = (blob: Blob, fileName: string, text: string, url: string) => shareFile(blob, fileName, `${text}\n${url}`);

/** Phone's own share sheet for the link. */
export async function shareLink(title: string, text: string, url: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: "Share with" });
      return true;
    } catch (error: any) {
      if (/cancel/i.test(String(error?.message))) return true;
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
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}
