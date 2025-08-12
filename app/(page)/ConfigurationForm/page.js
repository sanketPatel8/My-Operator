"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Image from "next/image";
import { useState,useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import Sidebar from "../sidebar/page";

export default function ConfigurationForm() {
  const [edit, setEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("/configurationform");
  const [formData, setFormData] = useState({
    brandName: "Brand name here",
    publicUrl: "https://www.arcmold3d.com/",
    shopUrl: "https://c1jaip-y0.myshopify.com",
    whatsapp: "+91 63563 63563",
  });


  const whatsappNumbers = [
    "+91 63563 63563",
    "+1 555 123 4567",
    "+44 1234 567890",
    "+61 412 345 678",
  ];

   const [selectedNumber, setSelectedNumber] = useState(whatsappNumbers[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filteredNumbers = whatsappNumbers.filter((number) =>
    number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (number) => {
    setSelectedNumber(number);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="font-source-sans flex flex-col min-h-screen">
      {/* Header */}
      <DashboardHeaader />
 
      {/* Main layout wrapper */}
      <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
        {/* Sidebar */}
        <Sidebar active={activeTab} onChange={setActiveTab} />
 
        {/* Main Content */}
        <main className="flex-1 bg-white border-l border-[#E9E9E9]">
          <div className="py-[14px] pl-[32px] border-b border-[#E9E9E9]">
            <h2 className="text-[18px] font-semibold text-[#1A1A1A]">
              Configuration
            </h2>
            <p className="text-[14px] text-[#999999]">
              Configure automation settings.
            </p>
          </div>
 
          <div className="max-w-[757px]">
            
    <div className="w-full font-source-sans">
      {/* Connection Info */}
      <div className=" md:ml-[32px] md:mt-[20px] p-[16px] bg-[#FFFFFF] border border-[#E3E7EB] rounded-[6px] flex flex-col md:flex-row items-center justify-between gap-[20px]">
      
      {/* Business Phone */}
      <div className="flex flex-1 items-center justify-between  w-full">
        {/* Left: Icon + Text */}
        <div className="flex items-center gap-[6px]">
            <Image
              src="/assets/phone.svg"
              alt="Phone"
              width={100}
              height={100}
              className="max-h-[36px] max-w-[36px]"
            />
          
          <div>
            <h3 className="text-[14px] font-semibold text-[#1A1A1A]">
              Business phone number
            </h3>
            <p className="text-[12px] text-[#999999]">+1 (555) 123-4567</p>
          </div>
        </div>

        {/* Status */}
        <span className="bg-[#F3F5F6] text-[#26B54F] text-[12px] px-[10px] py-1 rounded-[25px] font-semibold">
          Connected
        </span>
      </div>

      {/* Divider */}
      <div className="hidden md:block h-10 w-px bg-[#E3E7EB]" />

      {/* Shopify Store */}
      <div className="flex flex-1 items-center justify-between  w-full">
        {/* Left: Icon + Text */}
        <div className="flex items-center gap-[6px]">
          <Image
              src="/assets/shop.svg"
              alt="Phone"
              width={100}
              height={100}
              className="max-h-[36px] max-w-[36px]"
            />
          <div>
            <h3 className="text-[14px] font-semibold text-[#1A1A1A]">
              Shopify Store
            </h3>
            <p className="text-[12px] text-[#999999]">your-store.myshopify.com</p>
          </div>
        </div>

        {/* Status */}
        <span className="bg-[#F3F5F6] text-[#4275D6] text-[12px] px-[10px]  rounded-[25px] font-semibold">
          Verified
        </span>
      </div>
    </div>

      {/* Account Information */}
      <div className="bg-white border rounded-[6px]  p-[16px] md:ml-[32px] md:mt-[20px]">
        <h3 className="text-[16px] font-semibold text-[#1A1A1A] mb-[20px]">
          Account Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
          <div>
            <label className="text-[12px] text-[#555555] block mb-[4px]">
              Brand name
            </label>
            <input
              name="brandName"
              disabled={!edit}
              value={formData.brandName}
              onChange={handleChange}
              className="w-full border border-[#E9E9E9] rounded-[4px] bg-[#F3F5F6] px-[16px] py-[10px] text-[#1A1A1A] text-[14px]"
              placeholder="Brand name"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#555555] block mb-[4px]">
              Public shop Url
            </label>
            <input
              name="publicUrl"
              disabled={!edit}
              value={formData.publicUrl}
              onChange={handleChange}
              className="w-full border border-[#E9E9E9] rounded-[4px] bg-[#F3F5F6] px-[16px] py-[10px] text-[#1A1A1A] text-[14px]"
              placeholder="Public shop URL"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#555555] block mb-[4px]">
              Shop Url
            </label>
            <input
              name="shopUrl"
              disabled={!edit}
              value={formData.shopUrl}
              onChange={handleChange}
              className="w-full border border-[#E9E9E9] rounded-[4px] bg-[#F3F5F6] px-[16px] py-[10px] text-[#1A1A1A] text-[14px]"
              placeholder="Shop URL"
            />
          </div>

          <div className="w-full " ref={dropdownRef}>
      <label className="block text-[12px] text-[#555555] mb-[4px]">
        WhatsApp number
      </label>
      <div className="relative">
        <input
          type="text"
          disabled={!edit}
          value={isOpen ? searchTerm : selectedNumber}
          onClick={() => setIsOpen(!isOpen)}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Select or search number"
          className="w-full bg-[#F3F5F6] border border-[#E9E9E9] rounded-[4px]  px-[16px] py-[10px] text-[14px] text-[#333333] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* Right border line */}
        <div className="pointer-events-none absolute top-2.5 right-8 h-5 border-r-[0.5px] border-[#999999]"></div>
        {/* Dropdown icon */}
        <FiChevronDown className="pointer-events-none absolute top-3 right-2 text-[#999999]" />

        {/* Dropdown list */}
        {isOpen && (
          <ul className="absolute  w-full  rounded-md border border-[#D1D5DB] bg-white shadow-lg text-sm text-[#1A1A1A]">
            {filteredNumbers.length > 0 ? (
              filteredNumbers.map((number) => (
                <li
                  key={number}
                  onClick={() => handleSelect(number)}
                  className="cursor-pointer px-4 py-2 hover:bg-blue-100"
                >
                  {number}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-400">No numbers found</li>
            )}
          </ul>
        )}
      </div>
    </div>

        </div>
        </div>

        {/* Buttons */}
        <div className="mt-[28px] flex justify-center lg:justify-end">
          {edit ? (
            <>
              <button
                onClick={() => setEdit(false)}
                className="px-[24px] py-[10px] font-semibold text-sm text-[#343E55] cursor-pointer border border-[#E4E4E4] rounded-[4px] mr-[16px]"
              >
                Cancel
              </button>
              <button
                onClick={() => setEdit(false)}
                className="px-[24px] py-[10px] text-[14px] font-semibold bg-[#343E55] text-[#FFFFFF] rounded-[4px] cursor-pointer"
              >
                Save changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEdit(true)}
              className="px-[24px] py-[10px] text-[14px]  font-semibold bg-[#343E55] text-[#FFFFFF] rounded-[4px] cursor-pointer"
            >
              Edit information
            </button>
          )}
        </div>
        </div>
        </div>
        </main>
      </div>
    </div>
      
    
  );
}
