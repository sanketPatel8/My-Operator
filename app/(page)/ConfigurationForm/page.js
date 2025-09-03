
"use client";

import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useToastContext } from "@/component/Toast"; // Import the toast hook

function ConfigurationForm({ searchParams }) {
  // Get shop from URL params
  const shop = "sanket-store01.myshopify.com";

  
  const [edit, setEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("/ConfigurationForm");
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);

  // ✅ Initialize toast
  const { success, error } = useToastContext();

  const [formData, setFormData] = useState({
    brandName: "Brand name here",
    publicUrl: "https://www.arcmold3d.com/",
    shopUrl: "https://c1jaip-y0.myshopify.com",
    whatsapp: "", // Will be filled from database
  });

  const [whatsappNumbers, setWhatsappNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loading1, setLoading1] = useState(false);
  const dropdownRef = useRef(null);
  const [shopUrl, setShopUrl] = useState("");

  const filteredNumbers = whatsappNumbers.filter(({ countryCode, number }) =>
    `${countryCode} ${number}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // API service functions for fetching WhatsApp numbers
  const fetchWhatsAppNumbers = async (limit = 10, offset = 0, retryCount = 0) => {
    const maxRetries = 3;
    const storeToken = localStorage.getItem("storeToken");
    
    try {
      const url = `/api/whatsapp-numbers?limit=${limit}&offset=${offset}&expand=waba_account&storeToken=${encodeURIComponent(storeToken)}`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorData = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { message: await response.text() };
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorData = { message: `HTTP error! status: ${response.status}` };
        }
        
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success response:', data);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format received');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
      
      if (retryCount < maxRetries && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.log(`Retrying... Attempt ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchWhatsAppNumbers(limit, offset, retryCount + 1);
      }
      
      throw error;
    }
  };

  // Transform API data to extract phone numbers
  const transformApiDataToPhoneNumbers = (apiData) => {
    if (!apiData) {
      console.warn('No API data received');
      return [];
    }

    let results = [];

    if (apiData.data && Array.isArray(apiData.data.results)) {
      results = apiData.data.results;
    } else if (apiData.results && Array.isArray(apiData.results)) {
      results = apiData.results;
    } else if (Array.isArray(apiData.data)) {
      results = apiData.data;
    } else if (Array.isArray(apiData)) {
      results = apiData;
    } else {
      console.warn('Unexpected API response format:', apiData);
      return [];
    }

    return results
      .map(item => {
        const number = item.phone_number || item.phone;
        const waba_id = item.waba_account?.waba_id;
        const phone_number_id = item.phone_number_id;
        const countryCode = item.country_code || '';
        if (!number || !countryCode) return null;
        return {
          number,
          countryCode,
          waba_id,
          phone_number_id
        };
      })
      .filter(Boolean);
  };

  const transformApiDataToAccounts = (apiData) => {
    if (!apiData) {
      console.warn('No API data received');
      return [];
    }

    let results = [];

    if (apiData.data && Array.isArray(apiData.data.results)) {
      results = apiData.data.results;
    } else if (apiData.results && Array.isArray(apiData.results)) {
      results = apiData.results;
    } else if (Array.isArray(apiData.data)) {
      results = apiData.data;
    } else if (Array.isArray(apiData)) {
      results = apiData;
    } else {
      console.warn('Unexpected API response format:', apiData);
      return [];
    }

    return results.map((item, index) => ({
      id: item.id || `account_${index}`,
      name: item.display_name || item.name || `WhatsApp Business ${index + 1}`,
      phone: item.phone_number || item.phone || 'N/A',
      status: item.phone_number_status === 'connected' || item.status === 'active' ? 'Live' : 'Inactive',
      image: '/assets/profile.svg',
      onboardingStatus: item.onboarding_status || 'unknown',
      accountStatus: item.status || 'unknown',
      countryCode: item.country_code || '',
      shortCode: item.short_code || '',
      phoneNumberId: item.phone_number_id || item.id,
      created: item.created || '',
      modified: item.modified || '',
      wabaAccount: item.waba_account ? {
        id: item.waba_account.id,
        name: item.waba_account.waba_name || item.waba_account.name,
        wabaId: item.waba_account.waba_id,
        metaBusinessId: item.waba_account.meta_business_id,
        businessVerificationStatus: item.waba_account.business_verification_status || 'unverified',
        wabaReviewStatus: item.waba_account.waba_review_status || 'pending',
        created: item.waba_account.created || '',
        modified: item.waba_account.modified || ''
      } : null
    }));
  };

  // Main function to fetch and extract WhatsApp phone numbers
  const fetchWhatsAppPhoneNumbers = async () => {
    try {
      console.log("🔄 Fetching WhatsApp numbers...");
      
      const data = await fetchWhatsAppNumbers();
      const phoneNumbers = transformApiDataToPhoneNumbers(data);
      const accounts = transformApiDataToAccounts(data);

      setWhatsappNumbers(phoneNumbers);
      setWhatsappAccounts(accounts);
      
      console.log("📱 Extracted phone numbers:", phoneNumbers);
      console.log("🏢 Extracted accounts:", accounts);
      
      if (phoneNumbers.length === 0) {
        console.warn("⚠️ No phone numbers found in API response");
        return;
      }
      
      return phoneNumbers;
      
    } catch (error) {
      console.error("❌ Error fetching WhatsApp phone numbers:", error);
      // ✅ Show error toast
      error("Failed to fetch WhatsApp numbers");
      return ;
    }
  };
  

  // Fetch the stored WhatsApp number from database
  // Updated fetchStored function in your ConfigurationForm component
// Updated fetchStored function in your ConfigurationForm component
useEffect(() => {
  async function fetchStored() {
    try {
      // Get the store token from localStorage
      const storeToken = localStorage.getItem("storeToken");
      
      if (!storeToken) {
        console.warn("⚠️ No store token found in localStorage");
        setLoading(false);
        return;
      }

      console.log("🔄 Fetching stored phone with token", storeToken);
      
      // Make POST request with store token in body
      const res = await fetch(`/api/store-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ storeToken })
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          console.log("📭 No stored phone number found for this store");
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          console.log("🔒 Invalid store token");
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("💾 Database response:", data);
      
      const countryCode = data.countrycode || "91";
      const storedPhone = data.phonenumber;
      const shopurl = data.shop;
      const waba_id = data.waba_id;
      const phone_number_id = data.phone_number_id;

      console.log("shop url:::", shopurl);
      setShopUrl(shopurl);

      if (storedPhone) {
        const fullNumber = `${countryCode} ${storedPhone}`;
        setFormData((f) => ({ ...f, whatsapp: fullNumber }));

        const matched = whatsappNumbers.find(
          (item) =>
            item.number === storedPhone &&
            item.countryCode === countryCode &&
            item.waba_id === waba_id &&
            item.phone_number_id === phone_number_id
        );

        if (matched) {
          setSelectedNumber(matched);
        } else {
          setSelectedNumber({
            countryCode,
            number: storedPhone,
            phone_number_id: phone_number_id,
            waba_id: waba_id,
          });
        }
      } else {
        console.log("📭 No phone number in database response");
      }
      
    } catch (err) {
      console.error("❌ Error fetching stored phone:", err);
      error("Failed to load stored configuration");
    } finally {
      setLoading(false);
    }
  }

  fetchStored();
}, [whatsappNumbers]); // Removed 'shop' dependency since we no longer need it


  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item) => {
    setSelectedNumber(item);
    const fullNumber = `${item.countryCode} ${item.number}`;
    setFormData((prev) => ({ ...prev, whatsapp: fullNumber }));
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSaveChanges = async () => {
    setLoading1(true);
    try {
      if (!selectedNumber) {
        console.error("Missing selected number");
        // ✅ Show error toast instead of alert
        error("Please select a WhatsApp number");
        return;
      }

      const storeToken = localStorage.getItem("storeToken");

      const matchedAccount = whatsappAccounts.find((account) =>
        account.phone === selectedNumber.number && 
        account.countryCode === selectedNumber.countryCode
      );

      console.log("🔍 Selected number:", selectedNumber);
      console.log("🔍 Matched account:", matchedAccount);

      const payload = {
        storeToken: storeToken,
        countrycode: selectedNumber.countryCode,
        phonenumber: selectedNumber.number,
        phone_number_id: selectedNumber.phone_number_id || matchedAccount?.phoneNumberId || "",
        waba_id: selectedNumber.waba_id || matchedAccount?.wabaAccount?.wabaId || ""
      };

      console.log("📤 Sending update payload:", payload);

      const res = await fetch("/api/update-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("❌ Update failed:", result.message);
        // ✅ Show error toast instead of alert
        error(`Update failed: ${result.message}`);
        return;
      }
      setLoading1(false);
      success("Account information updated.");
      setEdit(false);

      
      
    } catch (err) {
      console.error("❌ Error updating store:", err);
      // ✅ Show error toast instead of alert
      error("Error updating store");
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleEditInfo = () => {
    fetchWhatsAppPhoneNumbers();
    setEdit(true);
  }

  if (loading) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  

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
            <p className="text-[12px] text-[#999999]">
              {selectedNumber?.countryCode && selectedNumber?.number
                ? `+${selectedNumber.countryCode} ${selectedNumber.number}`
                : "Not connected"}
            </p>
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
            <p className="text-[12px] text-[#999999]">{shopUrl}</p>
          </div>
        </div>

        {/* Status */}
        <span className="bg-[#F3F5F6] text-[#4275D6] text-[12px] px-[10px]  rounded-[25px] font-semibold">
          Verified
        </span>
      </div>
    </div>

      {/* Account Information */}
      <div className="bg-white border border-[#E3E7EB] rounded-[6px]  p-[16px] md:ml-[32px] md:mt-[20px]">
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
              value={shopUrl}
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
                value={isOpen
                  ? (searchTerm.startsWith('+') ? searchTerm : '+' + searchTerm)
                  : selectedNumber && selectedNumber.number
                    ? `+${selectedNumber.countryCode} ${selectedNumber.number}`
                    : ""
                }
                onClick={() => edit && setIsOpen(!isOpen)}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/^\+/, ''); // Remove + to store clean value
                  setSearchTerm(rawValue);
                }}
                placeholder="Select or search number"
                className="w-full bg-[#F3F5F6] border border-[#E9E9E9] rounded-[4px]  px-[16px] py-[10px] text-[14px] text-[#333333] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Right border line */}
              <div className="pointer-events-none absolute top-2.5 right-8 h-5 border-r-[0.5px] border-[#999999]"></div>
              {/* Dropdown icon */}
              <FiChevronDown className="pointer-events-none absolute top-3 right-2 text-[#999999]" />

              {/* Dropdown list */}
              {isOpen && (
                <ul className="absolute  w-full  rounded-md border border-[#D1D5DB] bg-white shadow-lg text-sm text-[#1A1A1A] z-10">
                  {filteredNumbers.length > 0 ? (
                    filteredNumbers.map((item, idx) => (
                      <li
                        key={`${item.countryCode}-${item.number}-${idx}`}
                        onClick={() => handleSelect(item)}
                        className="cursor-pointer px-4 py-2 hover:bg-blue-100"
                      >
                        +{`${item.countryCode} ${item.number}`}
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
                onClick={handleSaveChanges}
                className="px-[24px] py-[10px] text-[14px] font-semibold bg-[#343E55] text-[#FFFFFF] rounded-[4px] cursor-pointer"
              >
                {loading1 ? (
                <div className="flex items-center justify-center gap-2">
                  <span className='text-[#DFDFDF]'>please wait...</span>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                'Save changes'
              )}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditInfo}
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

export default ConfigurationForm;