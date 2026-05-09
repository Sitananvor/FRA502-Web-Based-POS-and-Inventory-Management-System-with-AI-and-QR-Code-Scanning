import type { Metadata } from "next";
import "./globals.css";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

export const metadata: Metadata = {
  title: "POStock",
  description: "Inventory and Point of Sale Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="p-[30px] flex-1 bg-gray-50">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
