import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corpore AI — Análise Corporal com Inteligência Artificial",
  description: "Transforme fotos corporais em um coach físico inteligente. Análise de composição corporal, plano de treino e nutrição personalizado com IA.",
  keywords: "análise corporal, composição corporal, fitness, nutrição, inteligência artificial",
  openGraph: {
    title: "Corpore AI",
    description: "Seu coach físico inteligente",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
