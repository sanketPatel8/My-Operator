
"use client";

import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";

function ConfigurationForm({ searchParams }) {
  // Get shop from URL params
  const shop = searchParams?.shop || "default-store";
  
  const [edit, setEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("/ConfigurationForm");
  

  const [formData, setFormData] = useState({
    brandName: "Brand name here",
    publicUrl: "https://www.arcmold3d.com/",
    shopUrl: "https://c1jaip-y0.myshopify.com",
    whatsapp: "", // Will be filled from database
  });

  const [whatsappNumbers, setWhatsappNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const [shopUrl, setShopUrl] = useState("");

  const filteredNumbers = whatsappNumbers.filter(({ countryCode, number }) =>
  `${countryCode} ${number}`.toLowerCase().includes(searchTerm.toLowerCase())
   );


  // API service functions for fetching WhatsApp numbers
const fetchWhatsAppNumbers = async (limit = 10, offset = 0, retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    // Use Next.js API route to avoid CORS issues
    const url = `/api/whatsapp-numbers?limit=${limit}&offset=${offset}&expand=waba_account`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Add timeout for client-side request
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
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format received');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);
    
    // Retry logic for network errors
    if (retryCount < maxRetries && (error.name === 'AbortError' || error.message.includes('fetch'))) {
      console.log(`Retrying... Attempt ${retryCount + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
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
      const countryCode = item.country_code || '';
      if (!number || !countryCode) return null;
      return {
        number,
        countryCode
      };
    })
    .filter(Boolean); // Remove nulls
};


// Main function to fetch and extract WhatsApp phone numbers
 const fetchWhatsAppPhoneNumbers = async () => {
  try {
    console.log("🔄 Fetching WhatsApp numbers...");
    
    const data = await fetchWhatsAppNumbers();
    const phoneNumbers = transformApiDataToPhoneNumbers(data);

    setWhatsappNumbers(phoneNumbers);
    
    console.log("📱 Extracted phone numbers:", phoneNumbers);
    
    if (phoneNumbers.length === 0) {
      console.warn("⚠️ No phone numbers found in API response");
      // Return fallback numbers if needed
      return ["+91 9319371489"];
    }
    
    return phoneNumbers;
    
  } catch (error) {
    console.error("❌ Error fetching WhatsApp phone numbers:", error);
    
    // Return fallback numbers on error
    return [{ countryCode: "+91", number: "9319371489" }];

  }
};

useEffect(() => {
 fetchWhatsAppPhoneNumbers();
}, []);

  // Fetch the stored WhatsApp number from database
  useEffect(() => {
    async function fetchStored() {
      if (!shop) {
        console.warn("⚠️ No shop parameter provided");
        setLoading(false);
        return;
      }

      try {
        console.log("🔄 Fetching stored phone for shop:", shop);
        const res = await fetch(`/api/store-phone?shop=${encodeURIComponent(shop)}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            console.log("📭 No stored phone number found for this shop");
            setLoading(false);
            return;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("💾 Database response:", data);
        
        // Updated to match your API response structure
        const countryCode = data.countrycode || "91"; // example default or from data
        const storedPhone = data.phonenumber;
        const shopurl = data.shop;

        console.log("shop url:::", shopurl);
        setShopUrl(shopurl);
        

        if (storedPhone) {
          const fullNumber = `${countryCode} ${storedPhone.startsWith(countryCode) ? storedPhone.replace(countryCode, '').trim() : storedPhone}`;
          console.log("✅ Found stored phone number with country code:", fullNumber);
          setFormData((f) => ({ ...f, whatsapp: fullNumber }));
          setSelectedNumber(fullNumber);
        }
          else {
            console.log("📭 No phone number in database response");
          }
        
      } catch (err) {
        console.error("❌ Error fetching stored phone:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStored();
  }, [shop]);


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
  const fullNumber = `${item.countryCode} ${item.number}`;
  setSelectedNumber(fullNumber);
  setFormData((prev) => ({ ...prev, whatsapp: fullNumber }));
  setIsOpen(false);
  setSearchTerm("");
  };

  const [storeData, setStoreData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchStoreDetailsById = async () => {
    const id = 11; // hardcoded ID

    try {
      const res = await fetch(`/api/store-phone?id=${id}`); // <-- ✅ this is correct
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch store');
      }

      console.log('✅ Fetched Store Data:', data);
      setStoreData(data);
    } catch (err) {
      console.error('❌ Fetch Error:', err.message);
      setError(err.message);
    }
  };

  fetchStoreDetailsById();
}, []);





  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  

  if (loading) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#343E55] mx-auto mb-4"></div>
              <p className="text-[#999999]">Loading configuration...</p>
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
            <p className="text-[12px] text-[#999999]">+{selectedNumber}</p>
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
            <p className="text-[12px] text-[#999999]">your-store.myshopify.com</p>
          </div>
        </div>

        {/* Status */}
        <span className="bg-[#F3F5F6] text-[#4275D6] text-[12px] px-[10px]  rounded-[25px] font-semibold">
          Verified
        </span>
      </div>
    </div>

      {/* Account Information */}
      <div className="bg-white border rounded-[6px]  p-[16px] md:ml-[32px] md:mt-[20px]">
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
          value={isOpen ? (searchTerm.startsWith('+') ? searchTerm : '+' + searchTerm) : (selectedNumber.startsWith('+') ? selectedNumber : '+' + selectedNumber)}
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
          <ul className="absolute  w-full  rounded-md border border-[#D1D5DB] bg-white shadow-lg text-sm text-[#1A1A1A]">
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
                onClick={() => setEdit(false)}
                className="px-[24px] py-[10px] text-[14px] font-semibold bg-[#343E55] text-[#FFFFFF] rounded-[4px] cursor-pointer"
              >
                Save changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEdit(true)}
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