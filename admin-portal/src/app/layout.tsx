import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WNC Admin Portal",
  description: "Institutional Administrative Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#050505] text-white antialiased selection:bg-[#633BBC]/30`}>
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#633BBC]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#633BBC]/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
