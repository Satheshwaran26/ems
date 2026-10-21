import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EmployeeHub",
  description: "Employee management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
