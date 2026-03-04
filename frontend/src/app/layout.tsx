'use client';

import { AuthProvider } from '../lib/auth-context';
import ChatbotIcon from '../components/ChatbotIcon';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f0f11" />
        <title>TaskFlow - Smart Task Management</title>
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {children}
            <ChatbotIcon />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
