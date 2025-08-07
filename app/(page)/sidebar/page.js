"use client";

import { useState } from "react";

export default function Sidebar({ active, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={toggleMenu}
          className="bg-white opacity-50 z-10 md:hidden"
        />
      )}

      <div
        className={`fixed md:relative md:w-64 w-full bg-white z-20 transition-all duration-300 ${
          isOpen ? "-left-64" : "left-0"
        }`}
      >
        <h2 className="text-[21px] text-[#343E55] border-b border-[#E9E9E9] py-[22px] pl-[28px] text-black font-bold">
          Ecomm+
        </h2>

        {/* Mobile Hamburger */}
        <div className="md:hidden mb-4">
          <button onClick={toggleMenu} className="text-white text-2xl">
            {isOpen ? "✕" : "☰"}
          </button>
        </div>

        <ul>
          <li
            onClick={() => onChange("config")}
            className={`cursor-pointer overflow-hidden ${
              active === "config"
                ? "bg-blue-50 text-[14px] py-[10px] pl-[24px] border-l-[4px] border-blue-600 text-[#333333]"
                : "text-[14px] py-[10px] pl-[24px] border-b border-[#E9E9E9] text-[#333333]"
            }`}
          >
            Configuration
          </li>
          <li
            onClick={() => onChange("workflow")}
            className={`cursor-pointer overflow-hidden ${
              active === "workflow"
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
