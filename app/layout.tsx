import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EmployeeHub",
    template: "%s | EmployeeHub",
  },
  description: "Employee management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ToastProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
