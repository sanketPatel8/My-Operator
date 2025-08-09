'use client';
import { FiChevronDown, FiChevronRight, FiMoreVertical   } from 'react-icons/fi';
import { useState, useRef } from 'react';
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";
import Image from 'next/image';
import { useClickOutside } from '@/Hook/useClickOutside';
import { useRouter } from 'next/navigation';


export default function DropDown({
  title,
  description,
  reminders = [],
  src,
  onToggle = () => {},
  onEyeClick = () => {},
  onMoreClick = () => {},
  onEditFlow = () => {},
  onDeleteFlow = () => {},
  EyeIcon,
  MoreIcon,
  buttonText,           // ← new prop
  onClickButton
}) {
    // Inside the component
const [openMenuId, setOpenMenuId] = useState(null);
const menuRefs = useRef({});
const router = useRouter();

useClickOutside({ current: menuRefs.current[openMenuId] }, () => {
  if (openMenuId !== null) setOpenMenuId(null);
});

 // Closes on outside click
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="font-source-sans border border-[#E9E9E9] rounded-[4px] mx-[10px] md:mx-[32px] bg-[#FFFFFF] ">
      {/* Header */}
      <div>
      <div
  className="p-[16px] cursor-pointer"
  onClick={() => setIsOpen(!isOpen)}
>
  <div className="flex items-start justify-between gap-[12px]">
    {/* Left: Icon + Title/Desc */}
    <div className="flex items-start space-x-[10px]">
      <Image
        src={src}
        alt="icon"
        width={100}
        height={100}
        className="max-h-[16px] max-w-[16px] mt-[4px]"
      />
      <div>
        <h2 className="text-[16px] text-[#1A1A1A]">{title}</h2>
        <p className="text-[12px] text-[#999999]">{description}</p>

        {/* Button (Mobile/Tablet only) */}
        {buttonText && onClickButton && (
          <div className="mt-[12px] md:hidden">
            <button
              onClick={onClickButton}
              className="bg-[#343E55] text-[#FFFFFF] text-[10px] font-semibold px-[8px] py-[5px] rounded-[4px] hover:bg-[#1f273a] transition flex items-center gap-[6px]"
            >
              <Image
                src="/assets/plus.svg"
                height={100}
                width={100}
                alt="plus"
                className="max-h-[11px] max-w-[11px]"
              />
              {buttonText}
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Right: Button (Desktop only) + Chevron (Always visible) */}
    <div className="flex items-center space-x-[20px]">
      {/* Button for desktop only */}
      {buttonText && onClickButton && (
        <button
          onClick={onClickButton}
          className="hidden md:flex bg-[#343E55] text-[#FFFFFF] text-[12px] font-semibold px-[16px] py-[10px] rounded-[4px] hover:bg-[#1f273a] transition items-center gap-[6px]"
        >
          <Image
            src="/assets/plus.svg"
            height={100}
            width={100}
            alt="plus"
            className="max-h-[11px] max-w-[11px]"
          />
          {buttonText}
        </button>
      )}

      {/* Chevron always on the far right */}
      <div className="cursor-pointer">
        {isOpen ? (
          <FiChevronDown size={20} className="my-[10px] text-[#999999]" />
        ) : (
          <FiChevronRight size={20} className="my-[10px] text-[#999999]" />
        )}
      </div>
    </div>
  </div>
</div>





        {/* Bottom border under description (only visible when open) */}
        {isOpen && <div className="border-b border-[#E9E9E9] mx-[16px]" />}
      </div>

      {/* Reminders */}
      {isOpen && (
        <div className="space-y-[10px] p-[16px]">
            
  {reminders.map((reminder) => (
    <div
      key={reminder.id}
      className="flex justify-between items-start bg-[#F8F9F9] hover:bg-[#F3F3F3] p-[16px] rounded-[4px] transition"
    >
      {/* Left: Toggle + Content */}
      <div className="flex items-start space-x-[10px]">
        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer mt-[4px]">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={reminder.enabled}
            onChange={() => onToggle(reminder.id)}
          />
          <div className="w-[32px] h-[16px] bg-[#D9D9D9] rounded-full peer-checked:bg-[#2B354E] transition-colors duration-300"></div>
          <div className="absolute left-[2px] top-[2px] w-[12px] h-[12px] bg-white border border-gray-300 rounded-full shadow peer-checked:translate-x-[16px] transform transition-transform duration-300"></div>
        </label>

        {/* Reminder Content */}
        <div className="space-y-[6px]">
          <p className="text-[14px] font-semibold text-[#1A1A1A]">{reminder.title}</p>
          <p className="text-[14px] text-[#A0A1A1]">{reminder.text}</p>
          <p className="text-[14px] text-[#A0A1A1] flex items-center gap-[6px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-[14px] h-[14px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#999999"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2m-4-10a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
            {reminder.footerText}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-start space-x-[12px] text-[#999999] ">
        {EyeIcon && (
          <EyeIcon
            className="cursor-pointer hover:text-[#666666] w-[16px] h-[16px]"
            onClick={() => onEyeClick(reminder)}
          />
        )}
       {MoreIcon && (
  <div className="relative"  ref={(el) => {
  if (!menuRefs.current) return;
  menuRefs.current[reminder.id] = el;
}}>
    <MoreIcon
      className="cursor-pointer hover:text-[#666666] w-[16px] h-[16px]"
       onClick={() => {
            onMoreClick(reminder);
            setOpenMenuId((prev) =>
            prev === reminder.id ? null : reminder.id
            );
        }}
    />

    {openMenuId === reminder.id && (
      <div className="absolute right-0 mt-[8px] w-[140px] bg-white border border-[#E9E9E9] shadow-md rounded-[6px] z-10 py-[6px]">
        <button
          type="button"
          className="flex items-center w-full px-[12px] py-[8px] text-[14px] text-[#1A1A1A] hover:bg-[#F5F5F5] space-x-[8px]"
          onClick={() => {
            onEditFlow(reminder);
            router.push("/editflow");
            setOpenMenuId(null);
          }}
        >
          <CiEdit size={17} /> <span>Edit flow</span>
        </button>
        <button
          type="button"
          className="flex items-center w-full px-[12px] py-[8px] text-[14px] text-[#1A1A1A] hover:bg-[#F5F5F5] space-x-[8px]"
          onClick={() => {
            onDeleteFlow(reminder);
            setOpenMenuId(null);
          }}
        >
          <MdDeleteOutline size={17} /> <span>Delete flow</span>
        </button>
      </div>
    )}
  </div>
)}

      </div>
    </div>
  ))}
</div>

      )}
    </div>
  );
}
