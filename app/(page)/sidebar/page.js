"use client";

import { useState } from "react";
import Link from "next/link";

export default function Sidebar({ active }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={toggleMenu}
          className="fixed inset-0 bg-white opacity-50 z-10 md:hidden"
        />
      )}

      {/* Sidebar (desktop and mobile) */}
      <div
        className={`fixed md:relative md:w-64 w-full h-screen bg-white p-4 md:p-6 z-20 transition-all duration-300 ${
          isOpen ? "-left-64" : "left-0"
        }`}
      >
        <h2 className="text-xl text-black font-bold mb-6">Ecomm+</h2>

        {/* Mobile Hamburger */}
        <div className="md:hidden mb-4">
          <button onClick={toggleMenu} className="text-white text-2xl">
            {isOpen ? "✕" : "☰"}
          </button>
        </div>

        <ul>
          <li
            className={`mb-4 text-black ${
              active === "config" ? "font-semibold" : ""
            }`}
          >
            <Link href="/">Configuration</Link>
          </li>
          <li
            className={`mb-4 ${active === "workflow" ? "font-semibold" : ""}`}
          >
            <Link href="/workflow">Workflow</Link>
          </li>
        </ul>
      </div>

      {/* Content area */}
    </>
  );
}
