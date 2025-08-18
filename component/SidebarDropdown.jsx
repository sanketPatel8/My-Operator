"use client";
import Image from "next/image";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";

export function SidebarDropdown({ label, icon, isOpen, onClick, children, sidebarOpen }) {
  return (
    <div className={`font-source-sans ${isOpen ? "bg-[#1A1F2E]  rounded-[20px]" : ""}`}>
      <div
        className={`py-[8px] px-[10px] flex items-center justify-between  text-[16px] hover:rounded-[46px] hover:text-[#FFFFFF] 
          cursor-pointer hover:bg-[#1A1F2E] text-[#878EAA]`}
        onClick={onClick}
      >
        <div className={`flex items-center ${sidebarOpen ? "justify-center w-full" : "gap-[10px]"}`}>
          <Image src={icon}  alt={label} width={16} height={16} />
          {!sidebarOpen && <span className={` ${isOpen ? "text-white " : " "}`}>{label}</span>}
        </div>
        {!sidebarOpen && <span>{isOpen ? <FaChevronDown size={12} color="white" /> : <FaChevronRight size={12} />}</span>}
      </div>
      
      {isOpen && !sidebarOpen && <div className="px-3">{children}</div>}
    </div>
  );
}
