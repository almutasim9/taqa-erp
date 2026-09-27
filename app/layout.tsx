import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'شمس ERP | الإدارة المالية',
  description: 'نظام مالي ومبيعات لشركات الطاقة الشمسية',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
