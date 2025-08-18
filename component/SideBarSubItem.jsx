"use client";

export function SidebarSubItem({ label, isOpen }) {
  if (isOpen) return null;
  return (
    <div className="font-source-sans mb-2 py-1 px-2 text-[14px] hover:text-[#2bb0a3] text-[#878EAA] cursor-pointer">
      {label}
    </div>
  );
}
