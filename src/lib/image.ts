import { API } from "./api";

// Uploaded photos are served by the API; imported ones are plain https links.
export const imageSrc = (url?: string | null) => (!url ? null : url.startsWith("/") ? `${API}${url}` : url);

// Shrinks a photo in the browser before upload (max 900px on the long side, JPEG) so files stay small.
// Logos pass "image/png" to keep a transparent background.
export function resizeImage(file: File, max = 900, quality = 0.85, type: "image/jpeg" | "image/png" = "image/jpeg"): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject(new Error("Choose a JPEG, PNG or WebP photo")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d")!;
      if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); } // JPEG has no transparency: use white
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(type, quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image")); };
    img.src = url;
  });
}
