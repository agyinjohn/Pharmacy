import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PharmaOne - Pharmacy management for single stores and multi-branch groups",
  description: "Batch and expiry stock control, prescriptions and controlled-drug register, point of sale, online ordering and delivery, and one view across every branch. Built for pharmacies in Ghana.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
