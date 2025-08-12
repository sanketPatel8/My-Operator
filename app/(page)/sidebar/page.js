"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar({ active, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
   const router = useRouter();
  const pathname = usePathname();

  const isActive = (route) => pathname === route

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
  {/* Hamburger Icon for Mobile */}
  <div className="md:hidden fixed top-3 right-[20px] z-60">
    <button
  onClick={toggleMenu}
  className={`text-2xl cursor-pointer ${isOpen ? "text-black" : "text-white"}`}
>
  {isOpen ? "✕" : "☰"}
</button>
  </div>

  {/* Backdrop for mobile */}
  {isOpen && (
    <div
      onClick={toggleMenu}
      className="fixed inset-0 bg-black opacity-30 z-10 md:hidden"
    />
  )}

  {/* Sidebar */}
  <div
    className={`fixed top-0 right-0 h-full md:relative md:top-auto md:left-auto md:h-auto md:w-64 w-64 bg-white z-20 transition-transform duration-300 transform ${
      isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
    }`}
  >
    <h2 className="text-[21px] text-[#343E55] border-b border-[#E9E9E9] py-[22px] pl-[28px] text-black font-bold">
      Ecomm+
    </h2>

    <ul>
      <li
        onClick={() => router.push("/ConfigurationForm")}
        className={`cursor-pointer overflow-hidden ${
          isActive("/ConfigurationForm")
            ? "bg-blue-50 text-[14px] py-[10px] pl-[24px] border-l-[4px] border-blue-600 text-[#333333]"
            : "text-[14px] py-[10px] pl-[24px] border-b border-[#E9E9E9] text-[#333333]"
        }`}
      >
        Configuration
      </li>
      <li
        onClick={() => router.push("/workflowlist")}
        className={`cursor-pointer overflow-hidden ${
          isActive("/workflowlist")
            ? "bg-blue-50 text-[14px] py-[10px] pl-[24px] border-l-[4px] border-blue-600 text-[#333333]"
            : "text-[14px] py-[10px] pl-[24px] border-b border-[#E9E9E9] text-[#333333]"
        }`}
      >
        Workflow
      </li>
    </ul>
  </div>
</>

  );
}
