import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Song and Scripture",
  description:
    "Church presentation software for Bible verses, song lyrics and video on screens during services. Works offline.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
