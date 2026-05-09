"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TextAlignJustify,
  LayoutDashboard,
  ScanLine,
  Warehouse,
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menus = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "POS", icon: ScanLine, path: "/pos" },
    { name: "Inventory", icon: Warehouse, path: "/inventory" },
  ];

  return (
    <div
      className={`sticky top-0 h-screen bg-gradient-to-b from-[#0F4C81] to-[#0a3560] text-white flex flex-col overflow-hidden shadow-xl shrink-0 transition-all duration-300 ease-in-out ${
        isOpen ? "w-[230px]" : "w-[75px]"
      }`}
    >
      {/* Toggle Button Section */}
      <div
        className={`flex items-center h-[70px] px-4 mb-[-2px] transition-all duration-300 ${isOpen ? "justify-end" : "justify-center"}`}
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors duration-200"
        >
          <TextAlignJustify
            size={24}
            className={`text-[#90CAF9] hover:text-white transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Logo Section */}
      <div className="flex items-center justify-center w-full h-[60px] px-4 gap-3 mb-6">
        <div
          className={`shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? "scale-125" : "scale-105 mr-[-11]"}`}
        >
          <img
            src="../../logo.png"
            alt="logo"
            className="w-[47px] h-[47px] object-contain"
          />
        </div>
        <span
          className={`font-bold tracking-tight whitespace-nowrap transition-all duration-300 ${
            isOpen
              ? "opacity-100 max-w-[150px] text-[28px] translate-x-0"
              : "opacity-0 max-w-0 -translate-x-4 pointer-events-none"
          }`}
        >
          POS<span className="text-[#64B5F6]">tock</span>
        </span>
      </div>

      <div className="mx-5 h-[1.3px] bg-white/20 mb-6" />

      {/* Menu List */}
      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-2">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname.startsWith(menu.path);

            return (
              <li key={menu.name}>
                <Link
                  href={menu.path}
                  className={`group relative flex items-center h-[50px] rounded-xl text-[16px] transition-all duration-300 ${
                    isOpen ? "px-4" : "justify-center mr-[-9px]"
                  }`}
                >
                  {isActive && (
                    <div
                      className={`absolute bg-[#64B5F6]/20 shadow-inner rounded-xl transition-all duration-300 -z-10
                      ${isOpen ? "inset-0" : "w-[50px] inset-y-0 mr-[12px]"}`}
                    />
                  )}

                  {isActive && (
                    <div className="absolute left-0 w-[3.5px] h-[30px] bg-[#64B5F6] rounded-r-full" />
                  )}

                  <Icon
                    size={22}
                    className={`shrink-0 transition-all duration-200 ${
                      isActive
                        ? "text-white" 
                        : "text-blue-100/70 group-hover:text-white group-hover:scale-107" 
                    }`}
                  />

                  <span
                    className={`ml-3 font-medium transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "opacity-100 max-w-[150px] translate-x-0"
                        : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                    } ${
                      isActive
                        ? "text-white" 
                        : "text-blue-100/70 group-hover:text-white" 
                    }`}
                  >
                    {menu.name}
                  </span>

                  {/* Hover Tooltip */}
                  {!isOpen && (
                    <div className="absolute left-[75px] px-2 py-1 bg-[#0a3560] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none whitespace-nowrap z-50">
                      {menu.name}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
