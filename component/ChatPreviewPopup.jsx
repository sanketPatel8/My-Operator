// @/component/ChatPreviewPopup.js
"use client";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToastContext } from './Toast'; 

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
      const response = await fetch(`/api/template?storeToken=${storeToken}&category_event_id=${categoryEventId}`);
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

  const getTemplateContentBlocks = () => {
    if (!templateData || !templateData.data || templateData.data.length === 0) {
      return [];
    }

    const firstTemplateData = templateData.data[0];
    if (!firstTemplateData.content || !firstTemplateData.content.components) {
      return [];
    }

    return firstTemplateData.content.components;
  };

  const getTemplateMessage = () => {
    const contentBlocks = getTemplateContentBlocks();
    const bodyBlock = contentBlocks.find(block => block.type === "BODY");
    
    if (bodyBlock?.text) {
      // Replace variables with actual values or placeholders
      let message = bodyBlock.text;
      
      // Replace variable placeholders with sample data
      message = message.replace(/\{\{(\d+)\}\}/g, (match, num) => {
        const variableMap = {
          '1': 'John Doe',
          '2': 'Order #12345',
          '3': '$99.99',
          '4': 'Today'
        };
        return variableMap[num] || `Variable ${num}`;
      });
      
      return message;
    }
    
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  <div className="w-[21px] h-[21px] mr-[4px] bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                    </svg>
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
                  className="flex-1 px-[15px] pt-[15px] overflow-y-auto"
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