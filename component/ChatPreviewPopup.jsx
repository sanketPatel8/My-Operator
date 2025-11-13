// @/component/ChatPreviewPopup.js
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useToastContext } from './Toast'; 
import Image from "next/image";
import { useClickOutside } from '@/hook/useClickOutside';

const ChatPreviewPopup = ({ isOpen, onClose, categoryEventId, storeToken }) => {
  const [templateData, setTemplateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Create ref for the modal content (not the overlay)
  const modalRef = useRef(null);
  
  const { success, error: showError } = useToastContext();

  useEffect(() => {
    if (isOpen && categoryEventId && storeToken) {
      fetchTemplateData();
    }
    // Reset states when popup closes
    if (!isOpen) {
      setTemplateData(null);
      setError(null);
    }
  }, [isOpen, categoryEventId, storeToken]);

  const fetchTemplateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/category-template?storeToken=${storeToken}&category_event_id=${categoryEventId}`);
      const result = await response.json();


      if (result.success && result.templates.length > 0) {
        setTemplateData(result.templates[0]); 
      } else {
        const errorMsg = 'No template found. Please set up a template first to preview.';
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (err) {
      console.error('Error fetching template data:', err);
      const errorMsg = 'Failed to load template data. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Use the click outside hook with the modal ref
  useClickOutside(modalRef, () => {
    if (isOpen) {
      onClose();
    }
  });

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const getTemplateContentBlocks = () => {
    
    if (!templateData || !templateData.data || templateData.data.length === 0) {
      return [];
    }

    const firstTemplateData = templateData.data[0];
    
    // Based on your data structure, content is directly an array
    if (firstTemplateData && Array.isArray(firstTemplateData.content)) {
      return firstTemplateData.content;
    }
    
    // Fallback: if content is an object with components property
    if (firstTemplateData && firstTemplateData.content && firstTemplateData.content.components) {
      return firstTemplateData.content.components;
    }

    return [];
  };

  const getVariableMappings = () => {
    if (!templateData || !templateData.data || templateData.data.length === 0) {
      return {};
    }

    const firstTemplateData = templateData.data[0];
    const variableMap = {};


    // Extract variables from the template data
    if (firstTemplateData && firstTemplateData.variables && Array.isArray(firstTemplateData.variables)) {
      firstTemplateData.variables.forEach((variable) => {
        // Get the variable position/number from template_variable_id or use a counter
        const variableId = variable.template_variable_id;
        const variablePosition = variable.variable_name; // This should be "1", "2", "4" etc.
        
        
        // Prioritize fallback_value for preview, then mapping_field, then a default
        let displayValue = variable.fallback_value || 
                          variable.mapping_field || 
                          `Variable ${variablePosition}`;
        
        // If fallback_value exists and it's meaningful, use it
        if (variable.fallback_value && variable.fallback_value.trim() !== '') {
          displayValue = variable.fallback_value;
        }
        // If mapping_field exists, use it as backup
        else if (variable.mapping_field && variable.mapping_field.trim() !== '') {
          displayValue = variable.mapping_field;
        }
        // Otherwise use variable name or position
        else {
          displayValue = variable.variable_name || `Variable ${variablePosition}`;
        }
        
        // Map by variable_name (which seems to be the position: "1", "2", "4")
        if (variable.variable_name) {
          variableMap[variable.variable_name] = displayValue;
        }
        
        // Also map by template_variable_id as backup
        if (variableId) {
          variableMap[variableId.toString()] = displayValue;
        }
      });
    }

    return variableMap;
  };

  const getTemplateMessage = () => {
    const contentBlocks = getTemplateContentBlocks();
    
    // Find the body block
    const bodyBlock = contentBlocks.find(block => block.type === "BODY");
    
    if (bodyBlock?.text) {
      let message = bodyBlock.text;
      const variableMappings = getVariableMappings();
      
      
      // Replace variable placeholders with mapped values
      // Handle {{1}}, {{2}}, {{4}}, etc. format (based on your API structure)
      message = message.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        
        // Check if we have a mapping for this variable
        if (variableMappings[varName]) {
          const replacement = variableMappings[varName];
          return replacement;
        }
        
        return match;
      });
      
      return message;
    }
    
    return '';
  };

  if (!isOpen) return null;

  const templateMessage = getTemplateMessage();

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
    >
      {/* Modal container - this is what we want to detect clicks outside of */}
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent event bubbling
      >
        {/* Popup Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Chat Preview</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Popup Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading template...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            /* Chat Preview */
            <div>
              <div className="h-[571px] w-[317px] mx-auto flex-shrink-0 rounded-[20px] overflow-hidden flex flex-col border border-[#E4E4E4] bg-white">
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
                    {(() => {
                      const contentBlocks = getTemplateContentBlocks();
                      const headerBlock = contentBlocks.find(
                        (block) => block.type === "HEADER"
                      );

                      if (
                        (headerBlock && headerBlock.format === "MEDIA")
                      ) {
                        return (
                          <div className="text-center">
                            <Image
                              src="/assets/placeholder.webp"
                              alt="preview"
                              height={100}
                              width={100}
                              className="h-[150px] w-[275px] cursor-pointer"
                            />
                          </div>
                        );
                      }

                      return null;
                    })()}

                    {/* Body Text */}
                    {(() => {
                      const contentBlocks = getTemplateContentBlocks();

                      if (templateMessage) {
                        return (
                          <div>
                            {templateMessage.split("\n").map((line, idx) => (
                              <p
                                key={idx}
                                style={{
                                  fontFamily: "sans-serif",
                                  lineHeight: "1.4",
                                }}
                              >
                                {line}
                                <br />
                              </p>
                            ))}
                          </div>
                        );
                      }


                      const bodyBlock = contentBlocks.find(
                        (block) => block.type === "BODY"
                      );

                      if (bodyBlock?.text) {
                        return (
                          <div>
                            {bodyBlock.text.split("\n").map((line, idx) => (
                              <p
                                key={idx}
                                style={{
                                  fontFamily: "sans-serif",
                                  lineHeight: "1.4",
                                }}
                              >
                                {line}
                                <br />
                              </p>
                            ))}
                          </div>
                        );
                      }

                      return null;
                    })()}

                    <p className="text-[12px] bg-white text-right text-[#999999] pr-2">
                      2:29
                    </p>

                    {/* Button */}
                    <div className="">
                      {(() => {
                        const contentBlocks = getTemplateContentBlocks();
                        const buttonBlock = contentBlocks.find(
                          (block) => block.type === "BUTTONS"
                        );

                        if (buttonBlock && buttonBlock.buttons?.length > 0) {
                          return (
                            <div className="text-center">
                              {buttonBlock.buttons.map((btn, idx) => (
                                <button
                                  key={idx}
                                  className="text-[#4275D6] w-full border-t border-[#E9E9E9] text-[14px] font-medium px-4 py-3"
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
                <div className="flex items-center bg-[url('/assets/wp_bg.svg')] bg-repeat overflow-y-hidden py-[9px] px-[4px]">
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
                    className="max-h-[16px] max-w-[16px] z-20 absolute ml-[225px] md:ml-[210px] cursor-pointer"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPreviewPopup;