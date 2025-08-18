"use client";
import Image from "next/image";


export function SidebarItem({ label, icon, active, isOpen }) {
  return (
    <div
      className={`font-source-sans py-[8px] px-[10px] flex items-center ${
        isOpen ? "justify-center" : "gap-[10px]"
      } text-[14px] hover:rounded-[46px] hover:text-[#FFFFFF] cursor-pointer hover:bg-[#242736] ${
        active ? "rounded-[46px] bg-[#242736] text-[#FFFFFF]" : "text-[#878EAA]"
      }`}
    >
      <Image src={icon} alt={label} width={14} height={14} />
      {!isOpen && <span>{label}</span>}
    </div>
  );
}
