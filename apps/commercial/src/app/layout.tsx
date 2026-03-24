import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commercial",
  description: "Subprojeto comercial"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
