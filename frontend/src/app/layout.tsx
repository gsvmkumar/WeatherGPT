import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WeatherGPT — Conversational AI Weather",
  description:
    "Real-time weather forecasting, alerts, and climate information powered by conversational AI. Get weather insights for any location in natural language.",
  keywords: ["weather", "AI", "forecast", "alerts", "India", "WeatherGPT"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('weathergpt_theme');
                  if (!theme) {
                    var store = localStorage.getItem('weathergpt-store');
                    if (store) {
                      var parsed = JSON.parse(store);
                      theme = parsed && parsed.state && parsed.state.theme;
                    }
                  }
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
