"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import React from "react";
import Sidebar from "../sidebar/page";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";
import { Listbox } from "@headlessui/react";
import { useToastContext } from "@/component/Toast";

function CreateFlow() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customEventTitle, setCustomEventTitle] = useState("");
  const [customEventSubtitle, setCustomEventSubtitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { success, error } = useToastContext();

 const eventOptions = [
    "Order Created",
    "Order Fulfilled",
    "Fulfillment update",
  ];
  const templateOptions = [
    "Order placed confirmation",
    "Shipping update",
    "COD confirmation request",
    "Order delivery",
    "Abandoned cart reminder",
  ];

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("/workflowlist");

  const handleSubmit = async () => {
    console.log('=== CREATE CUSTOM WORKFLOW ===');
    console.log('Selected Event:', selectedEvent);
    console.log('Selected Template:', selectedTemplate);
    console.log('Custom Event Title:', customEventTitle);
    console.log('Custom Event Subtitle:', customEventSubtitle);
   

    // Validation
    if (!selectedEvent.trim()) {
      error('Please select a custom event');
      return;
    }

    if (!selectedTemplate.trim()) {
      error('Please select a WhatsApp template');
      return;
    }

    // Use selectedEvent as title if customEventTitle is empty
    const eventTitle = customEventTitle.trim() || selectedEvent;
    const eventSubtitle = customEventSubtitle.trim() || `Automated ${selectedTemplate.toLowerCase()} message`;

    console.log('Final Event Title:', eventTitle);
    console.log('Final Event Subtitle:', eventSubtitle);

    const storeToken = localStorage.getItem("storeToken");
    if (!storeToken) {
      error('Store token not found. Please login again.');
      return;
    }

    setIsCreating(true);

    try {
      // Create custom workflow using PUT endpoint with special flag
      const response = await fetch('/api/category', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeToken: storeToken,
          isCustomWorkflowCreation: true, // Special flag to indicate custom workflow creation
          customEventTitle: eventTitle,
          customEventSubtitle: eventSubtitle,
          template_id: null,
          template_data_id: null, 
          template_variable_id: null
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Custom workflow created successfully:', result.data);
        success(`Custom workflow "${eventTitle}" created successfully!`);
        
        // Navigate back to workflow list
        router.push('/workflowlist');
      } else {
        console.error('❌ Failed to create custom workflow:', result.message);
        error(`Failed to create custom workflow: ${result.message}`);
      }

    } catch (err) {
      console.error('❌ Error creating custom workflow:', err);
      error('An error occurred while creating the custom workflow. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedEvent("");
    setSelectedTemplate("");
    setCustomEventTitle("");
    setCustomEventSubtitle("");
    
  };

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
                Create Custom WorkFlow
              </h2>
            </div>

            {/* Content Section */}
            <div className="flex flex-col lg:flex-row">
              {/* Form Section */}
              <div className="md:w-full lg:w-2/3 mx-[10px] md:mx-[32px] mt-[24px]">
                {/* Row 1: Event and Template Selection */}
                <div className="flex flex-col md:flex-row gap-[24px]">
                  {/* Custom Event */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Custom Event <span className="text-red-500">*</span>
                    </label>
                    <Listbox value={selectedEvent} onChange={setSelectedEvent}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                          {selectedEvent || "Select event"}
                          <div className="pointer-events-none absolute right-[42px] top-1/2 -translate-y-1/2 h-[16px] border-r border-[#999999]" />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                          {eventOptions.map((event, idx) => (
                            <Listbox.Option
                              key={idx}
                              className={({ active }) =>
                                `cursor-default select-none py-2 pl-4 pr-4 ${
                                  active ? "bg-gray-100" : ""
                                }`
                              }
                              value={event}
                            >
                              {event}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>

                  {/* WhatsApp Template */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Select WhatsApp template <span className="text-red-500">*</span>
                    </label>
                    <Listbox value={selectedTemplate} onChange={setSelectedTemplate}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                          {selectedTemplate || "Select a template"}
                          <div className="pointer-events-none absolute right-[42px] top-1/2 -translate-y-1/2 h-[16px] border-r border-[#999999]" />
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

                {/* Row 2: Custom Title and Subtitle */}
                <div className="flex flex-col md:flex-row gap-[24px] mt-[24px]">
                  {/* Custom Event Title */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Custom Event Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave empty to use selected event name"
                      value={customEventTitle}
                      onChange={(e) => setCustomEventTitle(e.target.value)}
                      className="w-full rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-[14px] text-[#333333] focus:outline-none focus:border-[#343E55]"
                    />
                  </div>

                  {/* Custom Event Subtitle */}
                  <div className="flex-1">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Custom Event Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Brief description of this workflow"
                      value={customEventSubtitle}
                      onChange={(e) => setCustomEventSubtitle(e.target.value)}
                      className="w-full rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-[14px] text-[#333333] focus:outline-none focus:border-[#343E55]"
                    />
                  </div>
                </div>

                {/* Preview Section */}
                <div className="mt-[24px] p-[16px] bg-[#F8F9FA] border border-[#E9E9E9] rounded-[4px]">
                  <h3 className="text-[14px] font-semibold text-[#333333] mb-[8px]">
                    Workflow Preview
                  </h3>
                  <div className="text-[12px] text-[#666666]">
                    <p><strong>Title:</strong> {customEventTitle || selectedEvent || 'Not selected'}</p>
                    <p><strong>Description:</strong> {customEventSubtitle || (selectedTemplate ? `Automated ${selectedTemplate.toLowerCase()} message` : 'Not configured')}</p>
                    <p><strong>Template:</strong> {selectedTemplate || 'Not selected'}</p>
                    <p><strong>Trigger:</strong> When {selectedEvent || 'event'} occurs</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-[16px] mt-[32px] md:mb-[0px] mb-[20px]">
                  <button
                    onClick={resetForm}
                    disabled={isCreating}
                    className="border border-[#E4E4E4] text-[#343E55] px-[24px] py-[10px] rounded-[4px] text-[14px] font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => router.push("/workflowlist")}
                    disabled={isCreating}
                    className="border border-[#E4E4E4] text-[#343E55] px-[24px] py-[10px] rounded-[4px] text-[14px] font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isCreating || !selectedEvent || !selectedTemplate}
                    className="bg-[#343E55] px-[24px] py-[10px] text-[#FFFFFF] font-semibold rounded-[4px] text-[14px] hover:bg-[#1f2a44] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      'Create workflow'
                    )}
                  </button>
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
                  <div className="flex-1 bg-[url('/assets/wp_bg.svg')] bg-repeat p-4 overflow-y-hidden flex flex-col justify-center items-center">
                    <div className="text-center text-[#666666] text-[14px]">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-[#E9E9E9] rounded-full mx-auto mb-2 flex items-center justify-center">
                          <Image
                            src="/assets/wp_icon.svg"
                            alt="whatsapp"
                            width={24}
                            height={24}
                          />
                        </div>
                        <p className="font-semibold">Template Preview</p>
                      </div>
                      {selectedTemplate ? (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-[#E9E9E9] max-w-[200px]">
                          <p className="text-[12px] text-[#333333] text-left">
                            This will show your {selectedTemplate.toLowerCase()} message template once configured.
                          </p>
                          <div className="mt-2 text-[10px] text-[#999999]">
                            Template: {selectedTemplate}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[12px]">Select a template to see preview</p>
                      )}
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
                      disabled
                    />
                    <Image
                      src="/assets/wp_upload.svg"
                      alt="wp upload"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] z-20 absolute ml-[195px] md:ml-[180px] cursor-pointer opacity-50"
                    />
                    <Image
                      src="/assets/wp_camera.svg"
                      alt="wp camera"
                      height={100}
                      width={100}
                      className="max-h-[16px] max-w-[16px]  z-20 absolute ml-[225px] md:ml-[210px] cursor-pointer opacity-50"
                    />
                    <Image
                      src="/assets/mic.svg"
                      alt="wp mic"
                      height={100}
                      width={100}
                      className="max-h-[40px] max-w-[40px] bg-[#343E55] ml-[11px] p-[9px] rounded-full cursor-pointer opacity-50"
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

export default CreateFlow;
