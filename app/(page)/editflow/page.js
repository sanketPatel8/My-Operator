"use client";

import DashboardHeaader from "@/component/DashboardHeaader";
import React from "react";
import Sidebar from "../sidebar/page";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";
import { Listbox } from "@headlessui/react";

function Editflow() {
  const [selectedDelay, setSelectedDelay] = useState("1 hour");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [activePart, setActivePart] = useState("template");
  const [activeselect1, setActiveselect1] = useState("Name");
  const [activeselect2, setActiveselect2] = useState("Name");
  const [activeselect3, setActiveselect3] = useState("Name");
  const [activeselect4, setActiveselect4] = useState("Name");
  const [templateMessage, setTemplateMessage] = useState('');
  const [allTemplatesData, setAllTemplatesData] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [openUp, setOpenUp] = useState(false);
  const selectRef = useRef(null);

  const checkDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 200);
    }
  };

  async function fetchTemplateOptions(storeId) {
    try {
      const response = await fetch(`/api/template-data?store_id=${storeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template options');
      }

      const templates = await response.json();

      // Extract template names from the API response
      const templateOptions = templates.map(template => template.template_name);

      return templateOptions;
    } catch (error) {
      console.error('Error fetching template options:', error);
      return [];
    }
  }

  useEffect(() => {
    const storeId = '11'; // dynamically provide this
    fetchTemplateOptions(storeId).then(setTemplateOptions);
  }, []);


  async function fetchTemplateData(storeId) {
    const res = await fetch(`/api/template-data?store_id=${storeId}`);
    if (!res.ok) throw new Error('Failed to fetch template');
    const data = await res.json();
    return data;
  }


  useEffect(() => {
    async function loadTemplate() {
      try {
        const storeId = '11';
        const templates = await fetchTemplateData(storeId);
        setAllTemplatesData(templates);

        console.log("whole data:::", templates);
        
        // Automatically select the first template if none is selected
        if (!selectedTemplate && templates.length > 0) {
          const firstTemplate = templates[0];
          setSelectedTemplate(firstTemplate.template_name); // 👈 this is key
        }
      } catch (error) {
        console.error('Failed to load template', error);
      }
    }

    loadTemplate();
  }, []);



  useEffect(() => {
    window.addEventListener("resize", checkDropdownPosition);
    checkDropdownPosition();
    return () => window.removeEventListener("resize", checkDropdownPosition);
  }, []);

  useEffect(() => {
    if (!selectedTemplate || allTemplatesData.length === 0) return;

    const selectedTemplateObj = allTemplatesData.find(
      (template) => template.template_name === selectedTemplate
    );

    const contentBlocks = selectedTemplateObj?.data?.[0]?.content || [];
    const bodyBlock = contentBlocks.find((block) => block.type === "BODY");

    const message = bodyBlock?.text || '';
    setTemplateMessage(message);
  }, [selectedTemplate, allTemplatesData]);




  const delayOptions = [
    "Immediate",
    "15 minutes",
    "30 minutes",
    "1 hour",
    "6 hours",
    "12 hours",
    "24 hours",
  ];
  

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("/workflowlist");

  const dropdownOptions = [
    "Name",
    "Phone number",
    "Service number",
    "Order id",
  ];

  return (
    <>
      <div className="font-source-sans flex flex-col min-h-screen">
        {/* Header */}
        <DashboardHeaader />

        {/* Layout */}
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          {/* Sidebar */}
          <Sidebar active={activeTab} onChange={setActiveTab} />

          {/* Main Content */}
          <main className="flex-1 bg-white border-l border-[#E9E9E9]">
            {/* Top Bar */}
            <div className="py-[24px] pl-[32px] border-b border-[#E9E9E9] flex items-center gap-[12px]">
              <Image
                src="/assets/back.svg"
                alt="back"
                height={24}
                width={24}
                className="max-h-[24px] max-w-[24px] cursor-pointer"
                onClick={() => router.push("/workflowlist")}
              />
              <h2 className="text-[16px] font-semibold text-[#353535]">
                Edit workflow
              </h2>
            </div>

            {/* Content Section */}
            <div className="flex flex-col lg:flex-row">
              {/* Form Section */}
              <div className="md:w-full lg:w-2/3 mx-[10px] md:mx-[32px] mt-[24px]">
                <div className="flex flex-col md:flex-row gap-[24px]">
                  {/* Custom Event */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Delay
                    </label>
                    <Listbox value={selectedDelay} onChange={setSelectedDelay}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                          {selectedDelay}
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                          {delayOptions.map((delay, idx) => (
                            <Listbox.Option
                              key={idx}
                              className={({ active }) =>
                                `cursor-default select-none py-2 pl-4 pr-4 ${
                                  active ? "bg-gray-100" : ""
                                }`
                              }
                              value={delay}
                            >
                              {delay}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>

                  {/* WhatsApp Template */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Select WhatsApp template
                    </label>
                    <Listbox
                      value={selectedTemplate}
                      onChange={setSelectedTemplate}
                    >
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                          {selectedTemplate || "Select a template"}
                          
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                          {templateOptions.map((template, idx) => (
                            <Listbox.Option
                              key={idx}
                              className={({ active }) =>
                                `cursor-default select-none py-2 pl-4 pr-4 ${
                                  active ? "bg-gray-100" : ""
                                }`
                              }
                              value={template}
                            >
                              {template}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex mt-[32px]">
                  <div className="w-full">
                    <h2 className="text-[16px] font-semibold text-[#333333] mb-[20px]">
                      Mapping template variables & upload media
                    </h2>

                    {/* Tabs */}
                    <div className="flex space-x-[32px] ">
                      <button
                        onClick={() => setActivePart("template")}
                        className={`text-[14px] text-[#343E55] cursor-pointer font-medium pb-[4px] ${
                          activePart === "template"
                            ? "border-b-2 border-[#343E55]"
                            : "text-[#999999]"
                        }`}
                      >
                        Template variables
                      </button>
                      <button
                        onClick={() => setActivePart("media")}
                        className={`text-[14px] text-[#343E55] cursor-pointer font-medium pb-[4px] ${
                          activePart === "media"
                            ? "border-b-2 border-[#343E55]"
                            : "text-[#999999]"
                        }`}
                      >
                        Media
                      </button>
                    </div>

                    {/* Template Variables Tab */}
                    {activePart === "template" && (
                      <div className="mt-[20px]">
                    {/* Header */}
                    <div className="mb-[24px]">
                      <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                        Header
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-[20px]">
                        {/* Label */}
                        <span className="text-[#333333] text-[14px] w-full sm:w-36">
                          {"{{Value}}"}
                        </span>

                        {/* Dropdown */}
                        <Listbox value={activeselect1} onChange={setActiveselect1}>
                          <div className="relative w-full sm:w-48">
                            <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                              {activeselect1 || "Select a template"}
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[10px]">
                                <FiChevronDown className="h-[20px] w-[20px] text-[#999999]" />
                              </span>
                            </Listbox.Button>

                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[4px] bg-white py-1 px-0.5 text-sm text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                              {dropdownOptions.map((option, idx) => (
                                <Listbox.Option
                                  key={idx}
                                  className={({ active }) =>
                                    `cursor-default select-none py-2 pl-4 pr-4 ${
                                      active ? "bg-gray-100" : ""
                                    }`
                                  }
                                  value={option}
                                >
                                  {option}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </div>
                        </Listbox>

                        {/* Input */}
                        <input
                          type="text"
                          placeholder="Fallback value"
                          className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
                        />
                      </div>
                    </div>

                        {/* Body Variables */}
                        <div>
                          <h3 className="text-[14px] font-semibold text-[#999999] mb-[6px] ">
                            Body variables
                          </h3>

                          <div className="flex flex-wrap items-center mb-[16px] gap-3 sm:gap-[20px] overflow-visible">
                            {/* Label */}
                            <span className="text-[#333333] text-[14px] w-full sm:w-36">
                              {"{{Shopify_name}}"}
                            </span>

                            {/* Dropdown */}
                            <Listbox value={activeselect2} onChange={setActiveselect2}>
                              <div className="relative w-full sm:w-48">
                                <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                                  {activeselect2 || "Select a template"}
                                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[10px]">
                                    <FiChevronDown className="h-[20px] w-[20px] text-[#999999]" />
                                  </span>
                                </Listbox.Button>

                                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[4px] bg-white py-1 px-0.5 text-sm text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                                  {dropdownOptions.map((option, idx) => (
                                    <Listbox.Option
                                      key={idx}
                                      className={({ active }) =>
                                        `cursor-default select-none py-2 pl-4 pr-4 ${
                                          active ? "bg-gray-100" : ""
                                        }`
                                      }
                                      value={option}
                                    >
                                      {option}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </div>
                            </Listbox>

                            {/* Input */}
                            <input
                              type="text"
                              placeholder="Fallback value"
                              className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mb-[16px] sm:gap-[20px] overflow-visible">
                            {/* Label */}
                            <span className="text-[#333333] text-[14px] w-full sm:w-36">
                              {"{{Shopify_orderid}}"}
                            </span>

                            {/* Dropdown */}
                            <Listbox value={activeselect3} onChange={setActiveselect3}>
                              <div className="relative w-full sm:w-48 " ref={selectRef}>
                                <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                                  {activeselect3 || "Select a template"}
                                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[10px]">
                                    <FiChevronDown className="h-[20px] w-[20px] text-[#999999]" />
                                  </span>
                                </Listbox.Button>

                                <Listbox.Options  className={`absolute w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-50
                                    ${openUp ? "bottom-full mb-1" : "top-full mt-1"}`}
                                  style={{
                                    maxHeight: "200px",
                                  }}
                                >
                                  {dropdownOptions.map((option, idx) => (
                                    <Listbox.Option
                                      key={idx}
                                      className={({ active }) =>
                                        `cursor-default select-none py-2 pl-4 pr-4 ${
                                          active ? "bg-gray-100" : ""
                                        }`
                                      }
                                      value={option}
                                    >
                                      {option}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </div>
                            </Listbox>

                            {/* Input */}
                            <input
                              type="text"
                              placeholder="Fallback value"
                              className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mb-[16px] sm:gap-[20px] overflow-visible">
                            {/* Label */}
                            <span className="text-[#333333] text-[14px] w-full sm:w-36">
                              {"{{Shopify_value}}"}
                            </span>

                            {/* Dropdown */}
                            <Listbox value={activeselect4} onChange={setActiveselect4}>
                              <div className="relative w-full sm:w-48 " ref={selectRef}>
                                <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                                  {activeselect4 || "Select a template"}
                                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[10px]">
                                    <FiChevronDown className="h-[20px] w-[20px] text-[#999999]" />
                                  </span>
                                </Listbox.Button>

                                <Listbox.Options  className={`absolute w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-50
                                    ${openUp ? "bottom-full mb-1" : "md:top-full md:mt-1"}`}
                                  style={{
                                    maxHeight: "200px",
                                  }}
                                >
                                  {dropdownOptions.map((option, idx) => (
                                    <Listbox.Option
                                      key={idx}
                                      className={({ active }) =>
                                        `cursor-default select-none py-2 pl-4 pr-4 ${
                                          active ? "bg-gray-100" : ""
                                        }`
                                      }
                                      value={option}
                                    >
                                      {option}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </div>
                            </Listbox>

                            {/* Input */}
                            <input
                              type="text"
                              placeholder="Fallback value"
                              className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Media Tab */}
                    {activePart === "media" && (
                      <div className="mt-[20px]">
                        <div className="border-2 border-dashed bg-[#F3F5F699] border-[#E4E4E4] rounded-[8px] py-[14px] px-[32px] text-center text-gray-500">
                          <button className="px-[24px] mb-[8px] py-[10px] text-[#343E55] text-[14px] font-semibold bg-[#FFFFFF] border border-[#E4E4E4] rounded-[4px] ">
                            Upload from device
                          </button>
                          <p className="text-[12px] text-[#555555] mb-[6px]">
                            Or drag and drop file here
                          </p>
                          <p className="text-[12px] text-[#999999]">
                            Supported file types: .JPG, .JPEG, .PNG within 5MB
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end space-x-[16px] mt-[32px] mb-[20px]">
                      <button
                      onClick={() => router.push("/workflowlist")} 
                      className="px-[24px] py-[10px] border border-[#E4E4E4] rounded-[4px] text-[#343E55] text-[14px] font-semibold hover:bg-gray-100">
                        Cancel
                      </button>
                      <button className="px-[24px] py-[10px] bg-[#343E55] rounded-[4px] text-[#FFFFFF] text-[14px] font-semibold hover:bg-[#1f2a44]">
                        Update workflow
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Chat Preview */}
              <div className="flex justify-center items-center flex-grow bg-[#E8F1FC] min-h-[83.65vh]">
                <div className="h-[571px] w-[317px] my-[20px] mx-[32px] flex-shrink-0 rounded-[20px] overflow-hidden flex flex-col border border-[#E4E4E4] bg-white">
                  {/* Chat Header */}
                  <div className="bg-[#2A2F4F] flex items-center py-[16px] px-[20px] text-white">
                    <Image
                      src="/assets/back.svg"
                      alt="back btn"
                      height={100}
                      width={100}
                      className="max-h-[14px] max-w-[14px] invert brightness-200 mr-[10px] cursor-pointer "
                    />
                    <Image
                      src="/assets/wp_icon.svg"
                      alt="wp icon"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] mr-[4px]"
                    />
                    <h1 className="font-semibold text-[#FFFFFF] text-[18px]">
                      MyOperator
                    </h1>
                    <div className="ml-auto">
                      <Image
                        src="/assets/more_info.svg"
                        alt="more info"
                        height={100}
                        width={100}
                        className="max-h-[15px] max-w-[4px] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="flex-1 bg-[url('/assets/wp_bg.svg')] bg-repeat px-[15px] pt-[15px] overflow-y-auto no-scrollbar">
                    
                    <div className="bg-white rounded-[4px] px-[16px] pt-[16px] text-[14px]  text-[#1A1A1A]">
                      {templateMessage.split('\n').map((line, idx) => (
                            <p key={idx} style={{ 
                              fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Segoe UI Symbol, sans-serif',
                              lineHeight: '1.4'
                            }}>
                              {line}
                              <br />
                            </p>
                       ))}
                    </div>
                      {/* Timestamp */}
                      <p className="text-[12px] bg-white text-right text-[#999999] pr-2">2:29</p>

                        {/* Link Button */}
                        <div className="text-center bg-white py-[10px] border-t border-[#E9E9E9]">
                          <button className="text-[#4275D6] text-[14px] font-medium ">
                            🔗 Track your order
                          </button>
                        </div>
                        

                  </div>

                  {/* Chat Input */}
                  <div className="flex items-center bg-[url('/assets/wp_bg.svg')] bg-repeat overflow-y-hidden py-[9px] px-[4px] ">
                    <Image
                      src="/assets/Emoji.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[16px] max-w-[16px] absolute ml-[12px] cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Message"
                      className="flex-1 py-[10px] bg-white text-[#8798A0] pr-[60px] pl-[38px] rounded-[20px] border border-[#E4E4E4] outline-none text-[14px]"
                    />
                    <Image
                      src="/assets/wp_upload.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] z-20 absolute ml-[195px] md:ml-[180px] cursor-pointer"
                    />
                    <Image
                      src="/assets/wp_camera.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[16px] max-w-[16px]  z-20 absolute ml-[225px] md:ml-[210px] cursor-pointer"
                    />
                    <Image
                      src="/assets/mic.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[40px] max-w-[40px] bg-[#343E55] ml-[11px] p-[9px] rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Editflow;
