"use client";

import type { LucideIcon } from "lucide-react";

interface CardsProps {
  title: string;
  value: string | number;
  bgColor: string;
  icon: LucideIcon;
}

export default function Cards({
  title,
  value,
  bgColor,
  icon: Icon,
}: CardsProps) {
  return (
    <div
      className="flex items-center justify-between rounded-xl p-5 text-white shadow-md"
      style={{ backgroundColor: bgColor }}
    >
      <div>
        <p className="text-[18px] font-medium opacity-90 mt-1 ml-1">{title}</p>
        <p className="text-[23px] font-bold mt-5 mb-1 ml-1">{value}</p>
      </div>
      <div className="bg-white/20 p-3 -mt-[50px] -mr-[3px] rounded-full">
        <Icon size={24} color="#fff" />
      </div>
    </div>
  );
}
