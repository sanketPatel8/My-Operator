"use client";
import DashboardHeaader from '@/component/DashboardHeaader'
import React from 'react'
import Sidebar from '../sidebar/page'
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiChevronDown } from "react-icons/fi";
import { Listbox } from '@headlessui/react';

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

 
          <div className=" flex flex-1">
           <div className="w-2/3 mx-[32px] mt-[24px]">
              <div className="flex flex-col md:flex-row gap-[24px]">
                {/* Custom Event */}
                <div className="flex-1">
                  <label className="block text-[12px] text-[#555555] mb-[4px]">Custom Event</label>
                  <Listbox value={selectedEvent} onChange={setSelectedEvent}>
                    <div className="relative">
                      <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333]  focus:outline-none">
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
                                active ? 'bg-gray-100' : ''
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
                  <label className="block text-[12px] text-[#555555] mb-[4px]">Select WhatsApp template</label>
                  <Listbox value={selectedTemplate} onChange={setSelectedTemplate}>
                    <div className="relative">
                      <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333]  focus:outline-none">
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
                                active ? 'bg-gray-100' : ''
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
              <div className="flex justify-end gap-[16px] mt-[32px]">
                <button 
                onClick={() => router.push("/workflowlist")}
                className="border border-[#E4E4E4] text-[#343E55] px-[24px] py-[10px] rounded-[4px] text-[14px] font-semibold hover:bg-gray-100">
                  Cancel
                </button>
                <button className="bg-[#343E55] px-[24px] py-[10px] text-[#FFFFFF] font-semibold rounded-[4px] text-[14px] hover:bg-[#1f2a44]">
                  Create workflow
                </button>
              </div>
            </div>
            {/* Chat Preview */}
                <div className="w-1/3 flex justify-end px-[32px] py-[20px] bg-[#E8F1FC]">
                  <div className="w-[317px] h-[571px]  rounded-[20px] shadow-md overflow-hidden flex flex-col border border-[#E4E4E4]">
                    {/* Chat Header */}
                    <div className="bg-[#2A2F4F] flex items-center px-4 py-3 text-white">
                      <Image
                      src="/assets/back.svg"
                      alt='back btn'
                      height={100}
                      width={100}
                      className='max-h-[14px] max-w-[14px] invert brightness-200 mr-[10px] '
                      />
                      <Image
                      src="/assets/wp_icon.svg"
                      alt='wp icon'
                      height={100}
                      width={100}
                      className='max-h-[21px] max-w-[21px] mr-[4px]' 
                      />
                      <h1 className="font-semibold text-[#FFFFFF] text-[18px]">MyOperator</h1>
                      <div className="ml-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="white"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M12 12h.01M18 12h.01" />
                        </svg>
                      </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 bg-[url('/assets/wp_bg.svg')] bg-repeat p-4 overflow-y-hidden">
                      {/* Chat messages go here */}
                    </div>

                    {/* Chat Input */}
                    <div className="flex items-center px-4 py-2 ">
                      <Image
                      src="/assets/Emoji.svg"
                      alt='wp emoji'
                      height={100}
                      width={100}
                      className='max-h-[16px] max-w-[16px] absolute ml-[12px]' 
                      />
                      <input
                        type="text"
                        placeholder="Message"
                        className="flex-1 px-4 py-2 text-[#8798A0] pr-[60px] pl-[38px] rounded-full border border-[#E4E4E4] outline-none text-sm"
                      />
                      <Image
                      src="/assets/wp_upload.svg"
                      alt='wp emoji'
                      height={100}
                      width={100}
                      className='max-h-[21px] max-w-[21px] z-20 absolute ml-[191px]' 
                      />
                      <Image
                      src="/assets/wp_camera.svg"
                      alt='wp emoji'
                      height={100}
                      width={100}
                      className='max-h-[16px] max-w-[16px]  z-20 absolute ml-[224px]' 
                      />
                      <Image
                      src="/assets/mic.svg"
                      alt='wp emoji'
                      height={100}
                      width={100}
                      className='max-h-[24px] max-w-[22px] bg-[#343E55] ' 
                      />
                      
                    </div>
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