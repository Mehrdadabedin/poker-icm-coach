/* Shrinks a chosen photo to a square before upload (plan 094): a phone photo is
 * several MB, the server takes 200 KB at most, and the seat shows 30 px. */
import type { PortraitUpload } from "./portraitApi";

export const PORTRAIT_SIZE = 256;
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.addEventListener("load", () => { URL.revokeObjectURL(url); resolve(img); }, { once: true });
    img.addEventListener("error", () => { URL.revokeObjectURL(url); reject(new Error("unreadable image")); }, { once: true });
    img.src = url;
  });
}

/** The centre square of the photo, PORTRAIT_SIZE wide, as WebP (JPEG where the
 * browser cannot write WebP, as older Safari). */
export async function resizePortrait(file: File): Promise<PortraitUpload> {
  if (!ACCEPTED.includes(file.type)) throw new Error("unsupported type");
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PORTRAIT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx || side === 0) throw new Error("unreadable image");
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
    0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  let url = canvas.toDataURL("image/webp", 0.85);
  if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/jpeg", 0.85);
  const [head, data] = url.split(",");
  return { contentType: head.includes("webp") ? "image/webp" : "image/jpeg", data };
}
