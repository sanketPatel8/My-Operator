"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../../sidebar/page";
import Image from "next/image";
import { FiChevronDown } from "react-icons/fi";
import { Listbox } from "@headlessui/react";

function Editflow() {
  const router = useRouter();
  const params = useParams();
  const category_event_id = params.id;
  const category_id = "";



  // Debug: log them
  useEffect(() => {
    console.log("URL Parameters:", {
     
      category_event_id,
     
    });

    
  }, [category_event_id, router]);



  const [selectedDelay, setSelectedDelay] = useState( "1 hour");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [activePart, setActivePart] = useState("template");
  const [templateMessage, setTemplateMessage] = useState('');
  const [allTemplatesData, setAllTemplatesData] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [templateVariables, setTemplateVariables] = useState({
    header: [],
    body: [],
    buttons: []
  });
  const [variableSettings, setVariableSettings] = useState({});
  const [openUp, setOpenUp] = useState(false);
  const selectRef = useRef(null);
  const [activeTab, setActiveTab] = useState("/workflowlist");

  const checkDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 200);
    }
  };

  useEffect(() => {
    

    const initializeWorkflows = async () => {
      try {

        const updatedRes = await fetch('/api/category');
        if (!updatedRes.ok) {
          throw new Error(`Failed to fetch categories after POST: ${updatedRes.status}`);
        }

       const updatedData = await updatedRes.json();

      console.log("✅ Updated workflow data:", updatedData);

      // Make sure categories is an array
      if (!Array.isArray(updatedData?.categories)) {
        throw new Error("Invalid data: 'categories' is not an array");
      }

      const categoryData = updatedData.categories.flatMap((category) =>
        (category.events || []).map((event, index) => ({
          id: event.category_event_id || index + 1,
          enabled: false,
          title: event.title,
          text: event.subtitle,
          footerText: event.delay ? `Send after ${event.delay}` : '',
          category_id: category.category_id ?? null,
          categoryName: category.categoryName ?? null,
          category_event_id: event.category_event_id
        }))
      );

      console.log("✅ categoryData:", categoryData);

      const matchedEvent = categoryData.find(item => item.category_event_id == params.id);

      // Check and log result
      if (matchedEvent) {
        console.log("✅ Matched Event:", matchedEvent);
      } else {
        console.log("❌ No event found with category_event_id =", params.id);
      }

        


      } catch (err) {
        console.error("❌ Error with workflows:", err);
        setError(err.message);
      } finally {
        
      }
    };

    initializeWorkflows();
  }, []);

  // Extract variables from text using regex
  const extractVariables = (text) => {
    if (!text) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1].trim());
    }
    return variables;
  };

  
async function fetchTemplateOptions(storeId) {
  try {
    const response = await fetch(`/api/template-data?store_id=${storeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch template options');
    }

    const data = await response.json();
    
    // Access the templates array from the response object
    const templates = data.templates;
    
    // Check if templates is an array before mapping
    if (!Array.isArray(templates)) {
      console.error('Templates is not an array:', templates);
      return [];
    }
    
    const templateOptions = templates.map(template => template.template_name);
    return templateOptions;
  } catch (error) {
    console.error('Error fetching template options:', error);
    return [];
  }
}

  useEffect(() => {
    const storeId = '11'; 
    fetchTemplateOptions(storeId).then(setTemplateOptions);
  }, []);

  async function fetchTemplateData(storeId) {
    const res = await fetch(`/api/template-data?store_id=${storeId}`);
    if (!res.ok) throw new Error('Failed to fetch template');
    const templates = await res.json();
    const data = templates.templates;
    return data;
  }

  useEffect(() => {
    async function loadTemplate() {
      try {
        const storeId = '11';
        const templates = await fetchTemplateData(storeId);
        setAllTemplatesData(templates);

        console.log("whole data:::", templates);
        
        if (!selectedTemplate && templates.length > 0) {
          const firstTemplate = templates[0];
          setSelectedTemplate(firstTemplate.template_name);
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
    
    // Extract variables from different components
    const headerVariables = [];
    const bodyVariables = [];
    const buttonVariables = [];

    contentBlocks.forEach(block => {
      switch (block.type) {
        case 'HEADER':
          if (block.format === 'TEXT' && block.text) {
            headerVariables.push(...extractVariables(block.text));
          }
          break;
        
        case 'BODY':
          if (block.text) {
            bodyVariables.push(...extractVariables(block.text));
            setTemplateMessage(block.text);
          }
          break;
        
        case 'BUTTONS':
          if (block.buttons && Array.isArray(block.buttons)) {
            block.buttons.forEach(button => {
              if (button.text) {
                buttonVariables.push(button.text);
              }
            });
          }
          break;
      }
    });

    // Remove duplicates and set variables
    setTemplateVariables({
      header: [...new Set(headerVariables)],
      body: [...new Set(bodyVariables)],
      buttons: [...new Set(buttonVariables)]
    });

    // Initialize variable settings
    const newSettings = {};
    [...headerVariables, ...bodyVariables, ...buttonVariables].forEach(variable => {
      if (!newSettings[variable]) {
        newSettings[variable] = {
          dropdown: "Name",
          fallback: ""
        };
      }
    });
    setVariableSettings(newSettings);

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

  const dropdownOptions = [
    "Name",
    "Phone number",
    "Service number",
    "Order id",
  ];

  const updateVariableSetting = (variable, field, value) => {
    setVariableSettings(prev => ({
      ...prev,
      [variable]: {
        ...prev[variable],
        [field]: value
      }
    }));
  };

  const handleUpdateWorkflow = async () => {
    try {
     
        const updatedRes = await fetch('/api/category');
        if (!updatedRes.ok) {
          throw new Error(`Failed to fetch categories after POST: ${updatedRes.status}`);
        }

       const updatedData = await updatedRes.json();


        const categoryData = updatedData.categories.flatMap((category) =>
          (category.events || []).map((event, index) => ({
            id: event.category_event_id || index + 1,
            enabled: false,
            title: event.title,
            text: event.subtitle,
            footerText: event.delay ? `Send after ${event.delay}` : '',
            category_id: category.category_id ?? null,
            categoryName: category.categoryName ?? null,
            category_event_id: event.category_event_id
          }))
        );

      console.log("✅ categoryData:", categoryData);

      const matchedEvent = categoryData.find(item => item.category_event_id == params.id);

      // Check and log result
      if (matchedEvent) {
        console.log("✅ Matched Event:", matchedEvent);
      } else {
        console.log("❌ No event found with category_event_id =", params.id);
      }

      
    

      // Validate required IDs before making the API call
      if (!matchedEvent.category_id || !matchedEvent.category_event_id) {
        alert("Missing required parameters: category_id or category_event_id");
        return;
      }

      // Convert IDs to numbers to ensure they're valid
      const numericCategoryId = parseInt(matchedEvent.category_id, 10);
      const numericEventId = parseInt(matchedEvent.category_event_id, 10);

      if (isNaN(numericCategoryId) || isNaN(numericEventId)) {
        alert("Invalid ID parameters");
        return;
      }

      // Prepare the update data with proper numeric IDs
      const updateData = {
        category_id: numericCategoryId,
        category_event_id: numericEventId,
        delay: selectedDelay,
        template: selectedTemplate,
        variableSettings,
        // Don't update title and subtitle as per requirement
      };

      console.log("Updating workflow with data:", updateData);

      // Make API call to update the workflow
      const response = await fetch('/api/category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Workflow updated successfully!");
        router.push("/workflowlist");
      } else {
        throw new Error(result.message || 'Failed to update workflow');
      }
      
    } catch (error) {
      console.error("Error updating workflow:", error);
      alert(`Failed to update workflow: ${error.message}`);
    }
  };

  const renderVariableRow = (variable, section) => (
    <div key={`${section}-${variable}`} className="flex flex-wrap items-center mb-[16px] gap-3 sm:gap-[20px]">
      {/* Variable Label */}
      <span className="text-[#333333] text-[14px] w-full sm:w-36">
        {`{{${variable}}}`}
      </span>

      {/* Dropdown */}
      <Listbox 
        value={variableSettings[variable]?.dropdown || "Name"} 
        onChange={(value) => updateVariableSetting(variable, 'dropdown', value)}
      >
        <div className="relative w-full sm:w-48">
          <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
            {variableSettings[variable]?.dropdown || "Name"}
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

      {/* Fallback Input */}
      <input
        type="text"
        placeholder="Fallback value"
        value={variableSettings[variable]?.fallback || ""}
        onChange={(e) => updateVariableSetting(variable, 'fallback', e.target.value)}
        className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
      />
    </div>
  );

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
              <div>
                <h2 className="text-[16px] font-semibold text-[#353535]">
                  Edit workflow
                </h2>
                
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col lg:flex-row">
              {/* Form Section */}
              <div className="md:w-full lg:w-2/3 mx-[10px] md:mx-[32px] mt-[24px]">
                <div className="flex flex-col md:flex-row gap-[24px]">
                  {/* Delay Dropdown */}
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

                  {/* Template Dropdown */}
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

                {/* Template Variables Section */}
                <div className="flex mt-[32px]">
                  <div className="w-full">
                    <h2 className="text-[16px] font-semibold text-[#333333] mb-[20px]">
                      Mapping template variables & upload media
                    </h2>

                    {/* Tabs */}
                    <div className="flex space-x-[32px]">
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
                        {/* Header Variables */}
                        {templateVariables.header.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Header
                            </h3>
                            {templateVariables.header.map((variable) => 
                              renderVariableRow(variable, 'header')
                            )}
                          </div>
                        )}

                        {/* Body Variables */}
                        {templateVariables.body.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Body variables
                            </h3>
                            {templateVariables.body.map((variable) => 
                              renderVariableRow(variable, 'body')
                            )}
                          </div>
                        )}

                        {/* Button Variables */}
                        {templateVariables.buttons.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Button
                            </h3>
                            {templateVariables.buttons.map((variable) => 
                              renderVariableRow(variable, 'buttons')
                            )}
                          </div>
                        )}

                        {/* No Variables Message */}
                        {templateVariables.header.length === 0 && 
                         templateVariables.body.length === 0 && 
                         templateVariables.buttons.length === 0 && (
                          <div className="text-center py-[40px] text-[#999999]">
                            <p>No template variables found in the selected template.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Media Tab */}
                    {activePart === "media" && (
                      <div className="mt-[20px]">
                        {/* Check if selectedTemplate has a media header */}
                        {(() => {
                          const template = allTemplatesData.find(
                            (t) => t.template_name === selectedTemplate
                          );
                          const headerBlock = template?.data?.[0]?.content?.find(
                            (block) => block.type === "HEADER"
                          );

                          if (headerBlock?.format === "MEDIA") {
                            return (
                              <div className="border-2 border-dashed bg-[#F3F5F699] border-[#E4E4E4] rounded-[8px] py-[14px] px-[32px] text-center text-gray-500">
                                
                                <Image
                                  src={`/api/media/${headerBlock.media_id}`}
                                  alt="Header Media"
                                  width={57}
                                  height={53}
                                  className="rounded-[6px] mx-auto mb-4"
                                />
                              </div>
                            );
                          }

                          return (
                            <div className="border-2 border-dashed bg-[#F3F5F699] border-[#E4E4E4] rounded-[8px] py-[14px] px-[32px] text-center text-gray-500">
                              <button className="px-[24px] mb-[8px] py-[10px] text-[#343E55] text-[14px] font-semibold bg-[#FFFFFF] border border-[#E4E4E4] rounded-[4px]">
                                Upload from device
                              </button>
                              <p className="text-[12px] text-[#555555] mb-[6px]">
                                Or drag and drop file here
                              </p>
                              <p className="text-[12px] text-[#999999]">
                                Supported file types: .JPG, .JPEG, .PNG within 5MB
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-[16px] mt-[32px] mb-[20px]">
                      <button
                        onClick={() => router.push("/workflowlist")} 
                        className="px-[24px] py-[10px] border border-[#E4E4E4] rounded-[4px] text-[#343E55] text-[14px] font-semibold hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpdateWorkflow}
                        className="px-[24px] py-[10px] bg-[#343E55] rounded-[4px] text-[#FFFFFF] text-[14px] font-semibold hover:bg-[#1f2a44]"
                      >
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
                      className="max-h-[14px] max-w-[14px] invert brightness-200 mr-[10px] cursor-pointer"
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
                    <div className="bg-white rounded-[4px] px-[16px] pt-[16px] text-[14px] text-[#1A1A1A] space-y-3">

                      {/* Header Media/Text */}
                      {allTemplatesData.length > 0 && selectedTemplate && (() => {
                        const template = allTemplatesData.find(
                          (t) => t.template_name === selectedTemplate
                        );

                        const headerBlock = template?.data?.[0]?.content?.find(
                          (block) => block.type === "HEADER"
                        );

                        if (!headerBlock) return null;

                        if (headerBlock.format === "MEDIA" && headerBlock.media_id) {
                          return (
                            <Image
                              src={`/api/media/${headerBlock.media_id}`} // Adjust API if needed
                                alt="Header"
                                width={200}
                                height={200}
                                className="rounded-[6px] mx-auto"
                              />
                            );
                          }

                          // If header is TEXT → show text
                          if (headerBlock.format === "TEXT" && headerBlock.text) {
                            return (
                              <p className="font-semibold  mb-2">
                                {headerBlock.text}
                              </p>
                            );
                          }

                          return null;
                        })()}


                        {/* Body Text */}
                        {templateMessage && (
                          <div>
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
                        )}

                        <p className="text-[12px] bg-white text-right text-[#999999] pr-2">2:29</p>
                        

                        {/* Button */}
                        <div className="">
                          {allTemplatesData.length > 0 && selectedTemplate && (() => {
                            const template = allTemplatesData.find(t => t.template_name === selectedTemplate);
                            const buttonBlock = template?.data?.[0]?.content?.find(block => block.type === "BUTTONS");

                            if (buttonBlock && buttonBlock.buttons?.length > 0) {
                              return (
                                <div className="text-center">
                                  {buttonBlock.buttons.map((btn, idx) => (
                                    <button
                                      key={idx}
                                      className="text-[#4275D6] w-full border-t border-[#E9E9E9]  text-[14px] font-medium px-4 py-3 "
                                    >
                                    {btn.text || "Click here"}
                                    </button>
                                  ))}
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>

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