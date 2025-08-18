"use client";

export function SidebarSubItem({ label, isOpen }) {
  if (isOpen) return null;
  return (
    <div className="group flex items-center  gap-2 mb-2 py-2 px-2 text-[16px] font-source-sans text-[#878EAA] hover:rounded-[46px] hover:bg-[#202332] hover:text-[#2bb0a3] cursor-pointer">
      
      {/* Dot appears on hover */}
      <span className="w-1 h-1 mr-1 rounded-full bg-[#2bb0a3] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>

      {label}
    </div>
  );
}
