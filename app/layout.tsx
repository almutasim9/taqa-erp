import type { Metadata } from 'next';
import './globals.css';
import './guide.css';

export const metadata: Metadata = {
  title: 'ERP-Taqa | منظومة إدارة الطاقة',
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
