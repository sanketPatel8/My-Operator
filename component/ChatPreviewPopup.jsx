// @/component/ChatPreviewPopup.js
"use client";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToastContext } from './Toast'; 
import Image from "next/image";

const ChatPreviewPopup = ({ isOpen, onClose, categoryEventId, storeToken }) => {
  const [templateData, setTemplateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
      console.log('Fetching template data for categoryEventId:', categoryEventId);
      const response = await fetch(`/api/category-template?storeToken=${storeToken}&category_event_id=${categoryEventId}`);
      const result = await response.json();

      console.log('API Response:', result);

      if (result.success && result.templates.length > 0) {
        setTemplateData(result.templates[0]); // Use the first template
        console.log('Template data set:', result.templates[0]);
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

  // Replace the existing getTemplateContentBlocks function with this:
  const getTemplateContentBlocks = () => {
    console.log('Template data structure:', templateData);
    
    if (!templateData || !templateData.data || templateData.data.length === 0) {
      console.log('No template data available');
      return [];
    }

    const firstTemplateData = templateData.data[0];
    console.log('First template data:', firstTemplateData);
    
    // Based on your data structure, content is directly an array
    if (firstTemplateData && Array.isArray(firstTemplateData.content)) {
      console.log('Content blocks found:', firstTemplateData.content);
      return firstTemplateData.content;
    }
    
    // Fallback: if content is an object with components property
    if (firstTemplateData && firstTemplateData.content && firstTemplateData.content.components) {
      return firstTemplateData.content.components;
    }

    console.log('No content blocks found');
    return [];
  };

  // Add this new function (place it before getTemplateMessage):
  // Replace your existing getVariableMappings function with this improved version:
const getVariableMappings = () => {
  if (!templateData || !templateData.data || templateData.data.length === 0) {
    return {};
  }

  const firstTemplateData = templateData.data[0];
  const variableMap = {};

  console.log('Processing variables for mapping:', firstTemplateData.variables);

  // Extract variables from the template data
  if (firstTemplateData && firstTemplateData.variables && Array.isArray(firstTemplateData.variables)) {
    firstTemplateData.variables.forEach((variable) => {
      // Get the variable position/number from template_variable_id or use a counter
      const variableId = variable.template_variable_id;
      const variablePosition = variable.variable_name; // This should be "1", "2", "4" etc.
      
      console.log(`Processing variable:`, variable);
      
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
        console.log(`Mapped variable ${variable.variable_name} to: ${displayValue}`);
      }
      
      // Also map by template_variable_id as backup
      if (variableId) {
        variableMap[variableId.toString()] = displayValue;
      }
    });
  }

  console.log('Final variable mappings:', variableMap);
  return variableMap;
};

// Also update your getTemplateMessage function to handle the mapping better:
const getTemplateMessage = () => {
  const contentBlocks = getTemplateContentBlocks();
  
  // Find the body block
  const bodyBlock = contentBlocks.find(block => block.type === "BODY");
  
  if (bodyBlock?.text) {
    let message = bodyBlock.text;
    const variableMappings = getVariableMappings();
    
    console.log('Original message:', message);
    console.log('Available variable mappings:', variableMappings);
    
    // Replace variable placeholders with mapped values
    // Handle {{1}}, {{2}}, {{4}}, etc. format (based on your API structure)
    message = message.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      console.log(`Looking for replacement for: ${match} (varName: ${varName})`);
      
      // Check if we have a mapping for this variable
      if (variableMappings[varName]) {
        const replacement = variableMappings[varName];
        console.log(`Replacing ${match} with: ${replacement}`);
        return replacement;
      }
      
      // If no mapping found, keep the original placeholder
      console.log(`No mapping found for ${match}, keeping original`);
      return match;
    });
    
    console.log('Final message:', message);
    return message;
  }
  
  return '';
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
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
            <div className="flex justify-center">
              <div className="h-[571px] w-[317px] rounded-[20px] overflow-hidden flex flex-col border border-[#E4E4E4] bg-white">
                {/* Chat Header */}
                <div className="bg-[#2A2F4F] flex items-center py-[16px] px-[20px] text-white">
                  <svg className="w-[14px] h-[14px] mr-[10px] fill-white" viewBox="0 0 24 24">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                  <div className="w-[21px] h-[21px] mr-[4px]  rounded-full flex items-center justify-center">
                    <Image
                      src="/assets/wp_icon.svg"
                      alt="wp icon"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] mr-[4px]"
                      />
                  </div>
                  <h1 className="font-semibold text-[#FFFFFF] text-[18px]">
                    MyOperator
                  </h1>
                  <div className="ml-auto">
                    <svg className="w-[4px] h-[15px] fill-white" viewBox="0 0 4 15">
                      <circle cx="2" cy="2" r="1.5"/>
                      <circle cx="2" cy="7.5" r="1.5"/>
                      <circle cx="2" cy="13" r="1.5"/>
                    </svg>
                  </div>
                </div>

                {/* Chat Body */}
                <div 
                  className="flex-1 px-[15px] pt-[15px] overflow-y-auto no-scrollbar"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundColor: '#e5ddd5'
                  }}
                >
                  <div className="bg-white rounded-[4px] px-[16px] pt-[16px] text-[14px] text-[#1A1A1A] space-y-3 shadow-sm">

                    {/* Header Media/Text */}
                    {(() => {
                      const contentBlocks = getTemplateContentBlocks();
                      const headerBlock = contentBlocks.find(
                        (block) => block.type === "HEADER"
                      );

                      if (!headerBlock) return null;

                      if (headerBlock.format === "MEDIA" && headerBlock.media_id) {
                        return (
                          <div className="w-full h-32 bg-gray-200 rounded-[6px] flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Media Content</span>
                          </div>
                        );
                      }

                      if (headerBlock.format === "TEXT" && headerBlock.text) {
                        return (
                          <p className="font-semibold mb-2">
                            {headerBlock.text}
                          </p>
                        );
                      }

                      return null;
                    })()}

                    {/* Body Text */}
                    {(() => {
                      const templateMessage = getTemplateMessage();
                      if (templateMessage) {
                        return (
                          <div>
                            {templateMessage.split('\n').map((line, idx) => (
                              <p key={idx} className="leading-relaxed">
                                {line}
                                {idx < templateMessage.split('\n').length - 1 && <br />}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      
                      return (
                        <div className="text-gray-500 italic">
                          No message content available
                        </div>
                      );
                    })()}

                    <p className="text-[12px] text-right text-[#999999] pr-2">2:29</p>
                    
                    {/* Buttons */}
                    {(() => {
                      const contentBlocks = getTemplateContentBlocks();
                      const buttonBlock = contentBlocks.find(block => block.type === "BUTTONS");

                      if (buttonBlock && buttonBlock.buttons?.length > 0) {
                        return (
                          <div className="border-t border-[#E9E9E9] -mx-4 -mb-4">
                            {buttonBlock.buttons.map((btn, idx) => (
                              <button
                                key={idx}
                                className="text-[#4275D6] w-full border-b border-[#E9E9E9] last:border-b-0 text-[14px] font-medium px-4 py-3 hover:bg-gray-50 transition-colors"
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

                {/* Chat Input */}
                <div 
                  className="flex items-center py-[9px] px-[4px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundColor: '#e5ddd5'
                  }}
                >
                  <div className="relative flex-1">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Message"
                      className="flex-1 w-full py-[10px] bg-white text-[#8798A0] pr-[60px] pl-[38px] rounded-[20px] border border-[#E4E4E4] outline-none text-[14px]"
                      readOnly
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                      </svg>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="w-[40px] h-[40px] bg-[#343E55] ml-[8px] rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
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