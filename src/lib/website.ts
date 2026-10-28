// Shared by the public pharmacy website and its editor in Settings.

export const DEFAULT_COLOR = "#28433d"; // PharmaOne green (brand-800)
export const COLOR_PRESETS = ["#28433d", "#1d4ed8", "#0f766e", "#7c2d12", "#6d28d9", "#be123c", "#334155"];

export const DEFAULT_SERVICES = [
  { title: "Prescriptions", text: "Bring your prescription or upload a photo online. A pharmacist checks it and explains how to take each medicine." },
  { title: "Health checks", text: "Blood pressure and blood sugar checks while you wait." },
  { title: "Advice from a pharmacist", text: "Ask about side effects, minor illnesses or which product is right for you." },
  { title: "Delivery and pick-up", text: "Order online and we deliver, or collect from your nearest branch." },
];

// What the site says when the pharmacy hasn't written its own text yet.
export const defaultHeadline = (name: string) => `Your trusted pharmacy, ${name}`;
export const defaultIntro = (name: string, branches: number) =>
  `${name} is a licensed community pharmacy${branches > 1 ? ` with ${branches} branches` : ""}. Talk to a pharmacist, fill your prescription, or order online for delivery.`;

// White or dark text, whichever reads better on the brand colour.
export function textOn(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return "#ffffff";
  const n = parseInt(m[1], 16); const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#0f172a" : "#ffffff";
}

// wa.me needs the number in international form without "+" or spaces; Ghana numbers starting 0 become 233.
export const whatsappLink = (n?: string) => { const d = (n || "").replace(/\D/g, ""); return d ? `https://wa.me/${d.startsWith("0") ? `233${d.slice(1)}` : d}` : null; };
export const telLink = (n?: string) => (n ? `tel:${n.replace(/[^\d+]/g, "")}` : null);
