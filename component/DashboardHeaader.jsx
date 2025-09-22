"use client";
import React from "react";
import { FiHelpCircle, FiBell, FiSettings } from "react-icons/fi";
import { FaPhoneAlt } from "react-icons/fa";
import Image from "next/image";

const DashboardHeaader = () => {
  return (
    


    <header className="sticky top-0 z-50 bg-[#171C2B] pl-[27px] pr-[68px] md:pr-[20px] px-[7px] h-[53px] flex items-center justify-between  shadow-sm">
      {/* Left: Logo and Title */}
      <a
        href="https://in.app.myoperator.co/home"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <Image
          src="/assets/wp_icon.svg"
          alt="wp icon"
          height={100}
          width={100}
          className="max-w-[39px] max-h-[39px]"
        />
        <span className="text-[#FFFFFF] text-sm font-semibold">MyOperator</span>
      </a>

      {/* Right: Icons */}
      <div className="flex items-center gap-[28px] py-[18px] text-white text-lg">
        <Image
        src="/assets/question-circle-white.svg"
        alt="question circle white"
        height={100}
        width={100}
        className="max-w-[17px] max-h-[17px]"
         />
      
      </div>
    </header>



  );
};

export default DashboardHeaader;
