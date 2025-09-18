'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToastContext } from "@/component/Toast";
import Link from 'next/link';

// API service functions




function ConnectWhatsApp() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isRetrying, setIsRetrying] = useState(false);
  const { success, error } = useToastContext();
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(true);
  const [pagination, setPagination] = useState({
    hasNext: false,
    hasPrevious: false,
    currentOffset: 0,
    limit: 10
  });

  
// Transform API data to match component format
const transformApiDataToAccounts = (apiData) => {
  if (!apiData) {
    console.warn('No API data received');
    return [];
  }

  let results = [];

  // ✅ Correctly handle `data.results`
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

  // Updated fetchWhatsAppNumbers function in your ConfigurationForm component
const fetchWhatsAppNumbers = async (limit = 10, offset = 0, retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    // Get the store token from localStorage
    const storeToken = localStorage.getItem("storeToken");
    
    if (!storeToken) {
      console.error("⚠️ No store token found in localStorage");
      throw new Error("Store token not found");
    }

    const url = `/api/whatsapp-numbers?limit=${limit}&offset=${offset}&expand=waba_account&storeToken=${storeToken}`;
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

     if (response.status === 403) {
        error('Company ID or  API Key is incorrect, Go back enter correct IDs');
      }

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

  // Memoized load function to prevent unnecessary re-renders
  const loadWhatsAppNumbers = useCallback(async (offset = 0, showLoading = true) => {
    try {
      
      setIsRetrying(true);
      setLoading(true);
      
      
      const data = await fetchWhatsAppNumbers(pagination.limit, offset);
      const transformedAccounts = transformApiDataToAccounts(data);
      
      setAccounts(transformedAccounts);
      
      // Set first account as selected if none selected and accounts exist
      if (transformedAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(transformedAccounts[0].id);
      }
      
      // Update pagination info
      setPagination(prev => ({
        ...prev,
        hasNext: data.next !== null && data.next !== undefined,
        hasPrevious: data.previous !== null && data.previous !== undefined,
        currentOffset: offset
      }));
      
    } catch (err) {
      // console.error('Error loading WhatsApp numbers:', err);
      // let errorMessage = 'Failed to load WhatsApp accounts. Please try again.';
      
      // Provide more specific error messages
      // if (err?.name === 'AbortError') {
      //   errorMessage = 'Request timeout. Please check your connection and try again.';
      // } else if (err?.message?.includes('500')) {
      //   errorMessage = 'Server error. Please try again in a few moments.';
      // } else if (err?.message?.includes('403')) {
      //   errorMessage = 'Access denied. Please check your API credentials.';
      // } else if (err?.message?.includes('404')) {
      //   errorMessage = 'API endpoint not found. Please contact support.';
      // }

      // error(errorMessage);

      
      
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [pagination.limit, selectedAccount]);

  // Fetch WhatsApp numbers on component mount
  useEffect(() => {
    const storeToken = localStorage.getItem("storeToken");
      
      if (!storeToken) {
        console.warn("⚠️ No store token found in localStorage");
        setIsRedirecting(true);
        window.location.href = process.env.NEXT_PUBLIC_REDIRECT_URL;
        return;
      }
      setLoading2(false);

    loadWhatsAppNumbers();
    
  }, [loadWhatsAppNumbers]);

  const handlesync = async () => {
    setIsRetrying(true);
    setLoading(true);
    
    try {
      await loadWhatsAppNumbers();
      success('WhatsApp accounts synced successfully!');
    } catch (err) {
      error('Failed to sync WhatsApp accounts. Please try again.');
    } finally {
      setIsRetrying(false);
      setLoading(false);
    }
  }

  // const handleNextPage = useCallback(() => {
  //   if (pagination.hasNext) {
  //     loadWhatsAppNumbers(pagination.currentOffset + pagination.limit);
  //   }
  // }, [loadWhatsAppNumbers, pagination.hasNext, pagination.currentOffset, pagination.limit]);

  // const handlePreviousPage = useCallback(() => {
  //   if (pagination.hasPrevious) {
  //     loadWhatsAppNumbers(Math.max(0, pagination.currentOffset - pagination.limit));
  //   }
  // }, [loadWhatsAppNumbers, pagination.hasPrevious, pagination.currentOffset, pagination.limit]);

  // const handleAccountSelect = useCallback((accountId) => {
  //   setSelectedAccount(accountId);
  // }, []);

  // const handleContinue = useCallback(() => {
  //   if (selectedAccount) {
  //     router.push("/ConfigurationForm");
  //   }
  // }, [router, selectedAccount]);

  

   const handleContinue = async () => {
    setLoading1(true);
    const selected = accounts.find(a => a.id === selectedAccount);
    if (!selected) {
      error('Please select an account.');
      return;
    }
    const storeToken = localStorage.getItem("storeToken");

    try {
      const response = await fetch('/api/update-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeToken: storeToken,
          countrycode: selected.countryCode,
          phonenumber: selected.phone,
          phone_number_id: selected.phoneNumberId,
          waba_id: selected?.wabaAccount?.wabaId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update store.');
      }

      const data = await response.json();
      console.log('Selected WABA ID:', selected?.wabaAccount?.wabaId);


      setLoading1(false);
      router.push('/ConfigurationForm');
    } catch (err) {
      console.error('Error updating store:', err);
      error('Failed to update store. Please try again.');
    }
  };


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'live':
        return 'text-[#00965C]';
      case 'inactive':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isRedirecting) {
  return (
      <div className="font-source-sans flex flex-col min-h-screen">
        
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">  
          
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
 }

 if (loading2) {
  return (
      <div className="font-source-sans flex flex-col min-h-screen">
        
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">  
          
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
 }


  
  

  return (
    <div className="font-source-sans min-h-screen flex items-start justify-center bg-[#F9FBFF] px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6 my-5 sm:p-8 lg:p-10 w-full max-w-md sm:max-w-lg lg:max-w-2xl">
        {/* Header */}
        <h2 className="text-xl sm:text-[24px] text-[#1A1A1A] font-semibold text-center mb-2">
          Connect WhatsApp Business API
        </h2>
        <p className="text-center text-[14px] text-[#333333] mb-6">
          Select your WhatsApp Business API account or link a new one
        </p>

        
        {/* Dynamic Options */}
        <div className="space-y-4">
          {loading && isRetrying ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading numbers...</p>
              </div>
            </div>
          ) : (
            accounts.map((account) => (
              <label
                key={account.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center p-4 border rounded-lg cursor-pointer shadow-sm gap-3 sm:gap-4 transition-all ${
                  selectedAccount === account.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500'
                }`}
                onClick={() => setSelectedAccount(account.id)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="account"
                    checked={selectedAccount === account.id}
                    onChange={() => setSelectedAccount(account.id)}
                    className="h-5 w-5 text-blue-600 accent-blue-600 cursor-pointer mr-3"
                  />
                  <Image
                    src={account.image}
                    alt="profile"
                    height={36}
                    width={36}
                    className="h-[36px] w-[36px]"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-[#333333]">{account.name}</p>
                  <p className="text-[14px] text-[#333333]">+{account.countryCode}{account.phone}</p>
                </div>
                <div className={`text-[14px] font-semibold ${getStatusColor(account.status)} sm:ml-auto`}>
                  {account.status}
                </div>
              </label>
            ))
          )}
        </div>

        {/* Link new */}
        <div className="mt-6">
            <Link
              target='blank'
              href={`${process.env.NEXT_PUBLIC_BASEURL}/whatsapp`}
              className="w-full border border-dashed border-[#E4E4E4] bg-[#FBFBFB] rounded-lg py-4 flex items-center justify-center text-[#4275D6] text-[14px] font-medium hover:underline"
            >
                <span className=" mr-1">＋</span> Link new WhatsApp account
            </Link>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <button
          onClick={() => router.push("/ConfigureWhatsApp")}
          className="w-full sm:w-auto px-6 py-2 border rounded text-[#343E55] hover:bg-gray-100">
            Back
          </button>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
            onClick={handlesync}
            className="px-6 py-2 border rounded text-[#343E55] hover:bg-gray-100 w-full sm:w-auto">
              ⟳ Sync
            </button>
            <button
              onClick={handleContinue}
              className="px-6 py-2 bg-gray-800 text-[#FFFFFF] rounded hover:bg-gray-900 w-full sm:w-auto"
            >
              {loading1 ? (
                <div className="flex items-center justify-center gap-2">
                  <span className='text-[#DFDFDF]'>set up your account</span>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                'Verify & Continue'
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ConnectWhatsApp;