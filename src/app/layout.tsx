/** @format */

import "./globals.css";
import type { Metadata } from "next";
import DisplaySettings from "@/components/common/display-settings";

export const metadata: Metadata = {
  title: "AI-CELM",
  description: "AI-integrated Civic Engagement Learning Model",
};

// Terapkan preferensi tampilan sebelum render agar tidak ada kedipan (FOUC).
const displayBootScript = `(function(){try{var d=document.documentElement,s=window.localStorage;var f=s.getItem('aicelm:font-scale');if(f){var n=String(f).replace('%','');d.style.setProperty('--app-font-scale',n+'%');}if(s.getItem('aicelm:theme')==='dark')d.setAttribute('data-theme','dark');if(s.getItem('aicelm:contrast')==='high')d.setAttribute('data-contrast','high');if(s.getItem('aicelm:simple')==='on')d.setAttribute('data-simple','on');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: displayBootScript }} />
      </head>
      <body>
        {children}
        <DisplaySettings />
      </body>
    </html>
  );
}
