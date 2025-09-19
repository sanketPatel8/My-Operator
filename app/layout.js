import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/component/Toast";
import { WorkflowProvider } from "@/component/WorkflowContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "My Operator",
  description:
    "My Operator is a smart platform that helps businesses manage and streamline daily operations with ease",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WorkflowProvider>
          <ToastProvider>
            <div id="app-root" className="flex min-h-screen">
              {" "}
              {/* ✅ new id */}
              <main className="flex-1 relative">
                {children}
                <div
                  id="toast-root"
                  className="absolute bottom-6 right-6 z-50"
                />
              </main>
            </div>
          </ToastProvider>
        </WorkflowProvider>
      </body>
    </html>
  );
}
