"use client";
import DashboardHeaader from '@/component/DashboardHeaader'
import React from 'react'
import Sidebar from '../sidebar/page'
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiChevronDown } from "react-icons/fi";

function createflow() {

  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const eventOptions = ['Order Created', 'Order Fulfilled', 'Fulfillment update']
  const templateOptions = ['Order placed confirmation', 'Shipping update', 'COD confirmation request', 'Order delivery', 'Abandoned cart reminder']

  const handleSubmit = () => {
    alert(`Event: ${selectedEvent} \nTemplate: ${selectedTemplate}`)
  }

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("/workflowlist");


  return (
    <>
    <div className="font-source-sans flex flex-col min-h-screen">
      {/* Header */}
      <DashboardHeaader />
 
      {/* Main layout wrapper */}
      <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
        {/* Sidebar */}
        <Sidebar active={activeTab} onChange={setActiveTab} />
 
        {/* Main Content */}
        <main className="flex-1 bg-white border-l border-[#E9E9E9]">
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
              Custom-Create WorkFlow
            </h2>
          </div>

 
          <div className="max-w-[702px]">
           <div className="max-w-[702px] mx-[32px] mt-[24px]">
              <div className="flex flex-col md:flex-row gap-[24px]">
                {/* Custom Event */}
                <div className="flex-1">
                  <label className="block text-[12px] text-[#555555] mb-[4px]">Custom Event</label>
                  <div className="relative w-full">
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="appearance-none w-full border border-[#E9E9E9] rounded-[4px] py-[10px] px-[16px]  text-[14px] text-[#333333]  focus:outline-none"
                    >
                      <option value="">Select event</option>
                      {eventOptions.map((event, index) => (
                        <option key={index} value={event}>
                          {event}
                        </option>
                      ))}
                    </select>

                    {/* Vertical line */}
                    <div className="pointer-events-none absolute right-[42px] top-1/2 -translate-y-1/2 h-[16px] border-r border-[#999999]" />

                    {/* Chevron Icon */}
                    <FiChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* WhatsApp Template */}
                <div className="flex-1">
                  <label className="block text-[12px] text-[#555555] mb-[4px]">Select WhatsApp template</label>
                  <div className="relative w-full">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="appearance-none w-full border border-[#E9E9E9] rounded-[4px] py-[10px] px-[16px]  text-[14px] text-[#333333]  focus:outline-none"
                    >
                      <option value="">Select a template</option>
                      {templateOptions.map((template, index) => (
                        <option key={index} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>

                    {/* Vertical line */}
                    <div className="pointer-events-none absolute right-[42px] top-1/2 -translate-y-1/2 h-[16px] border-r border-[#999999]" />

                    {/* Chevron Icon */}
                    <FiChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                
              </div>
              <div className="flex justify-end gap-[16px] mt-[32px]">
                <button className="border border-[#E4E4E4] text-[#343E55] px-[24px] py-[10px] rounded-[4px] text-[14px] font-semibold hover:bg-gray-100">
                  Cancel
                </button>
                <button className="bg-[#343E55] px-[24px] py-[10px] text-[#FFFFFF] font-semibold rounded-[4px] text-[14px] hover:bg-[#1f2a44]">
                  Create workflow
                </button>
              </div>
            </div>
            </div>
            </main>
            </div>
            </div>
    </>
  )
}

export default createflow