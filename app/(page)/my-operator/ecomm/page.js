"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Image from "next/image";
import { useState, useEffect} from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarItem } from "@/component/SideBarItem";
import { SidebarDropdown } from "@/component/SidebarDropdown";
import { FaChevronRight, FaChevronLeft, FaPowerOff, FaSearch   } from "react-icons/fa";
import { SidebarSubItem } from "@/component/SideBarSubItem";
import ToggleSwitch from "@/component/ToggleSwitch";

export default function ConfigurationForm() {
  const [edit, setEdit] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [showProfilePopup, setShowProfilePopup] = useState(false);


  useEffect(() => {
  function handleClickOutside(e) {
    if (!e.target.closest(".profile-popup")) {
      setShowProfilePopup(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);


  const [openDropdown, setOpenDropdown] = useState("");

  const toggleDropdown = (menu) =>
    setOpenDropdown(openDropdown === menu ? "" : menu);

  const isActive = (route) => pathname.includes(route);

  

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="font-source-sans flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1A1F2F] h-[53px] px-4 flex items-center justify-between">
        {/* Left Section: Logo + Info */}
        <div className="flex items-center gap-2">
    
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-[28px] text-white text-lg">
          <Image
            src="/assets/question-circle-white.svg"
            alt="Help"
            width={17}
            height={17}
          />
          <Image
            src="/assets/notification.svg"
            alt="Notifications"
            width={17}
            height={17}
          />
          <FaPowerOff size={17} className="cursor-pointer" onClick={() => setShowProfilePopup(!showProfilePopup)} />

        {showProfilePopup && (
    <div className="profile-popup absolute border border-gray-300 right-0 top-[53px] mt-2 w-[280px] bg-white border border-gray-200 rounded  z-[100]">
      <div className="p-[14px] border-b border-gray-200">
        <p className="text-[16px] text-[#333333] ">+91 9510304905 <strong>(Administrator)</strong></p>
        <p className="text-[14px] text-[#333333] mb-[10px]">deval@xceptive.com</p>
        <p className="text-[16px] text-black font-medium mb-[10px]">BLUE BERRY E-SERVICES</p>
        <button className=" text-[13px] bg-[#8DC027]   text-white px-[12px] py-[6px] ">Account usage</button>
      </div>

      <div className="px-[14px] pt-[14px] pb-[4px] bg-[#F6F6F6]">
        <div className="flex items-center border-b border-gray-200 pb-2 justify-between text-[#333333] text-sm">
          <span>Call availability</span>
          <ToggleSwitch />
        </div>
        </div>

        <div className="flex justify-between #F6F6F6 gap-1 px-4 mt-3 border-b border-gray-200 pb-3">
          <button className="bg-[#48A8F9] text-white px-3 py-1.5 text-[14px] ">Personal preferences</button>
          <button className="text-[14px] border text-[#333333] px-4 py-1.5">Logout</button>
        </div>

        <div className="flex w-full bg-[#F6F6F6] border-b border-gray-200 pb-3">
        <input
          type="text"
          placeholder="Search account"
          className="mt-3 mx-4 w-[250px] px-2 py-1 bg-white border border-gray-200 text-[16px] text-black "
        />
        <FaSearch size={12} color="gray" className="absolute ml-[240px] mt-6" />
        </div>

        <p className="text-[16px] py-2 bg-[#F6F6F6] pl-4   text-[#1A1A1A] cursor-pointer">Integration Testing</p>
        
      
    </div>
  )}
        </div>
      </header>

      {/* Sidebar */}
      
      <div
            className={`hidden md:flex flex-col   ${
                isOpen ? "w-[60px]" : "w-[186px]"
            } transition-all duration-300 h-screen overflow-y-auto no-scrollbar bg-[#0B0F1F] text-white  fixed top-0 left-0 z-90`}
            >


        {/* Sidebar Toggle Button */}
            {/* Sidebar Toggle Button */}
            <button
            onClick={toggleMenu}
            className={`fixed top-[14px] ${isOpen ? "left-[51px]" : "left-[177px]"} z-[100] bg-[#343E55] text-white p-[4px] rounded-full`}
            >
            {isOpen ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
            </button>


        {/* Logo & Phone */}
        <div className="sticky top-0 bg-[#0B0F1F] z-10 flex items-center gap-[5px] pt-[11px] pb-[20px] pl-[16px] ">
          <div className=" flex items-center justify-center">
            <Image
            src="\assets\wp_icon.svg"
            height={100}
            width={100}
            alt="wp-icon"
            className="max-h-[34px] max-w-[33px]"
            />
          </div>
          <div>
            <div className="font-semibold text-[#FFFFFF] text-[14px]">{!isOpen && <span>My Operator</span>}</div>
            <div className="text-[14px] text-[#FFFFFF] ">{!isOpen && <span>+91 8738358040</span>}</div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className={`flex flex-col gap-[8px] mb-3 ${
                isOpen ? "px-[5px]" : "px-[15px]"
            }`}>
        {/* Home */}
        <SidebarItem
          label="Home"
          icon="/assets/Home.svg"
          active={isActive("home")}
          isOpen={isOpen}
        />

        {/* Dashboard */}
        <SidebarItem
          label="Dashboard"
          icon="/assets/Dashboard.svg"
          active={isActive("dashboard")}
          isOpen={isOpen}
        />

        {/* Chat */}
        <SidebarItem
          label="Chat"
          icon="/assets/chat-dots.svg"
          active={isActive("chat")}
          isOpen={isOpen}
        />

        {/* Call logs */}
        <SidebarItem
          label="Call logs"
          icon="/assets/call-log.svg"
          active={isActive("call-logs")}
          isOpen={isOpen}
        />

        {/* WhatsApp (Dropdown) */}
        <SidebarDropdown
          label="Whatsapp"
          icon="/assets/whatsapp.svg"
          isOpen={openDropdown === "Whatsapp"}
          sidebarOpen={isOpen}
          onClick={() => toggleDropdown("Whatsapp")}
        >
          <SidebarSubItem key="wa1" label="Campaigns" isOpen={isOpen} />
          <SidebarSubItem key="wa2" label="Templates" isOpen={isOpen} />
          <hr className="mr-2 text-[#5B6178]" />
          <SidebarSubItem key="wa3" label="Accounts" isOpen={isOpen} />
          <SidebarSubItem key="wa4" label="Chat widget & QR code" isOpen={isOpen} />
          <SidebarSubItem key="wa5" label="Ads" isOpen={isOpen} />
        </SidebarDropdown>


        {/* Call */}
        <SidebarDropdown
          label="Call"
          icon="/assets/Call.svg"
          isOpen={openDropdown === "Call"}
          sidebarOpen={isOpen}
          onClick={() => toggleDropdown("Call")}
        >
          <SidebarSubItem key="cl1" label="Outgoing" isOpen={isOpen} />
          <SidebarSubItem key="cl2" label="Follow up" isOpen={isOpen} />
          <SidebarSubItem key="cl3" label="Webcall" isOpen={isOpen} />
          <hr className="mr-2 text-[#5B6178]" />
          <SidebarSubItem key="cl4" label="Design Call Flow" isOpen={isOpen} />
          <SidebarSubItem key="cl5" label="Follow up Settings" isOpen={isOpen} />
          <SidebarSubItem key="cl6" label="Block List" isOpen={isOpen} />
          <SidebarSubItem key="cl7" label="Disposition" isOpen={isOpen} />
          <SidebarSubItem key="cl8" label="Aftercall SMS" isOpen={isOpen} />
          <SidebarSubItem key="cl9" label="Breaktime" isOpen={isOpen} />


        </SidebarDropdown>

        {/* Bots */}
        <SidebarItem
          label="Bots"
          icon="\assets\bots.svg"
          active={isActive("bots")}
          isOpen={isOpen}
        />

        {/* Contact */}
        <SidebarItem
          label="Contact"
          icon="/assets/Contact.svg"
          active={isActive("contact")}
          isOpen={isOpen}
        />

        {/* Reports */}
        <SidebarDropdown
          label="Report"
          icon="/assets/Reports.svg"
          isOpen={openDropdown === "Report"}
          sidebarOpen={isOpen}
          onClick={() => toggleDropdown("Report")}
        >
          <SidebarSubItem key="re1" label="Call Reports" isOpen={isOpen} />
          <SidebarSubItem key="re2" label="Export" isOpen={isOpen} />
        </SidebarDropdown>

        {/* APIs & Webhook */}
        <SidebarItem
          label="APIs & Webhook"
          icon="/assets/APIs-Webhook.svg"
          active={isActive("api")}
          isOpen={isOpen}
        />

        {/* Ecomm+ (Active by default here) */}
        <SidebarItem
          label="Ecomm+"
          icon="/assets/bag-check.svg"
          active={true}
          isOpen={isOpen}
        />

        {/* Permission */}
        <SidebarItem
          label="Permission"
          icon="/assets/Permission.svg"
          active={isActive("permission")}
          isOpen={isOpen}
        />

        {/* System logs */}
        <SidebarItem
          label="System logs"
          icon="\assets\System logs.svg"
          active={isActive("logs")}
          isOpen={isOpen}
        />

        {/* Manage (Dropdown) */}
        <SidebarDropdown
          label="Manage"
          icon="/assets/Manage.svg"
          isOpen={openDropdown === "manage"}
          sidebarOpen={isOpen}
          onClick={() => toggleDropdown("manage")}
        >
          <SidebarSubItem key="ma1" label="Users" isOpen={isOpen} />
          <SidebarSubItem key="ma2" label="Department" isOpen={isOpen} />
          <SidebarSubItem key="ma3" label="DID's" isOpen={isOpen} />
        </SidebarDropdown>


        {/* Billing */}
        <SidebarDropdown
          label="Billing"
          icon="/assets/Billing.svg"
          isOpen={openDropdown === "Billing"}
          sidebarOpen={isOpen}
          onClick={() => toggleDropdown("Billing")}
        >
          <SidebarSubItem key="bi1" label="Billing" isOpen={isOpen} />
          <SidebarSubItem key="bi2" label="Business info" isOpen={isOpen} />
          <SidebarSubItem key="bi3" label="Preferences" isOpen={isOpen} />
        </SidebarDropdown>
      </nav>
      </div>
      

      {/* Main Content Layout */}
      <div className="flex flex-1">
        {/* Spacer for Sidebar */}
        <div className={`hidden md:block transition-all duration-300 ${isOpen ? "w-[60px]" : "w-[186px]"}`} />

        {/* Main Content */}
        <div className="flex-1 bg-[#F3F5F6] p-4">
          <main className="bg-white border-l border-[#E9E9E9] h-full">
            <div className="py-[16px] pl-[20px] border-b border-[#E9E9E9]">
              <h2 className="text-[18px] font-semibold text-[#1A1A1A]">Ecomm+</h2>
            </div>

            <div className="max-w-[757px]">
              <div className="w-full ">
                {/* Shopify & WooCommerce Boxes */}
                <div className="md:ml-[20px] md:mt-[27px] bg-[#FFFFFF] rounded-[6px] flex flex-col md:flex-row gap-[20px]">
                  {/* Shopify */}
                  <div className="p-[16px] border border-[#E3E7EB] max-w-[263px]">
                    <Image
                      src="/assets/shopify-logo.svg"
                      alt="Shopify"
                      width={100}
                      height={100}
                      className="max-h-[42px] max-w-[42px] mb-[16px]"
                    />
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-[10px]">
                        Shopify
                      </h3>
                      <p className="text-[14px] text-[#333333] mb-[16px]">
                        Engage your Shopify customers at every step. Send timely & automated WhatsApp
                        notifications for their order confirmations, shipping updates, and feedback
                        requests to build lasting loyalty.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <button className="bg-white cursor-pointer border border-[#E4E4E4] text-[#343E55] text-[12px] pr-[34px] pl-[16px] py-[10px] rounded-[4px] font-semibold">
                        Configure
                      </button>
                      <div className="absolute ml-20">
                        <Image
                          src="/assets/configure.svg"
                          height={100}
                          width={100}
                          alt="configure"
                          className="max-h-[12px] max-w-[12px] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WooCommerce */}
                  <div className="p-[16px] border border-[#E3E7EB] max-w-[263px]">
                    <Image
                      src="/assets/woo.svg"
                      alt="WooCommerce"
                      width={100}
                      height={100}
                      className="max-h-[43px] max-w-[72px] mb-[16px]"
                    />
                    <div>
                      <div className="flex items-start gap-[6px]">
                        <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-[10px]">
                          Woocommerce
                        </h3>
                        <p className="text-white text-[12px] px-[10px] bg-[#4275D6] rounded-[4px]">
                          Upcoming
                        </p>
                      </div>
                      <p className="text-[14px] text-[#333333] mb-[16px]">
                        MyOperator × WooCommerce Integration empowers you to seamlessly connect with
                        your Leads and Customers on LeadSquared CRM via WhatsApp. Effortlessly broadcast
                        promotional offers, updates, and alerts to thousands — all in just a few clicks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
