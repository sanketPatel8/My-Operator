"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ConnectShopify() {
  const router = useRouter();

  const [StoreName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStoreReadonly, setIsStoreReadonly] = useState(false);

  // Get token from URL and verify it
  useEffect(() => {
  const init = async () => {
    if (typeof window !== "undefined") {
      setLoading(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenParam = params.get("token");
        const shopParam = params.get("shop");

        if (tokenParam) {
          const isValid = await verifyToken(tokenParam);
          if (!isValid) {
            setErrorMessage("Invalid or expired token. Please try again.");
          }
        }

        if (shopParam) {
          setStoreName(shopParam);
          const res = await fetch(`/api/encrypt-store-id?shop=${shopParam}`);
          const data = await res.json();
          if (data.encryptedId) {
            localStorage.setItem("storeToken", data.encryptedId);
            console.log("Encrypted store id saved to localStorage ✅");
          } else {
            console.warn("No encrypted id returned:", data);
          }
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        
      }
    }
  };

  init();
 }, []);


  // Get company store after companyId is set - THIS WAS MISSING!
  useEffect(() => {
  const fetchStore = async () => {
    if (companyId && isTokenValid) {
      
      try {
        await getCompanyStore(companyId);
      } finally {
        setLoading(false); // ✅ only after call completes
      }
    }
  };
  fetchStore();
 }, [companyId, isTokenValid]);


  // Function to verify JWT token
  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Token verified successfully:", data);
        setIsTokenValid(true);
        setCompanyId(data.companyId);
        
        return true;
      } else {
        console.error("Token verification failed:", data);
        setIsTokenValid(false);
        return false;
      }
    } catch (error) {
      console.error("Token verification request failed:", error);
      setIsTokenValid(false);
      return false;
    }
  };

  // Function to get company's shop URL
  const getCompanyStore = async (companyId) => {
    try {
      const response = await fetch('/api/company-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (response.ok && data.shop) {
        // Auto-populate the store name and make it readonly
        setStoreName(data.shop);
        setIsStoreReadonly(true);
        console.log("Company store found:", data.shop);
      } else if (response.status === 404 && data.redirectUrl) {
        // Company not found, redirect to the provided URL
        console.log("Company not found, redirecting to:", data.redirectUrl);
        window.location.href = data.redirectUrl;
        return;
      } else {
        // Company exists but no store found, keep field editable
        setIsStoreReadonly(false);
        console.log("No store found for company, field remains editable");
      }
    } catch (error) {
      console.error("Error fetching company store:", error);
      // Keep field editable on error
      setIsStoreReadonly(false);
    }
  };

  // Validate store exists in database and handle routing logic
  const handleConnectStore = async () => {
    // Check if token is valid before proceeding

    try {

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const shopParam = params.get("shop");

    if(shopParam){

    const storeToken = localStorage.getItem("storeToken");
      
      if (!storeToken) {
        setErrorMessage("Store token not found. Please reinstall app and try again.");
        setIsLoading(false);
        return;
      }

      // Call the validation API
      const response = await fetch("/api/store-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeToken }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Store validated successfully:", data);
        router.push("/ConfigureWhatsApp");
      }
    }


    if(tokenParam){
    if (!isTokenValid) {
      setErrorMessage("Please verify your authentication first.");
      return;
    }

    if (!StoreName.trim()) {
      setErrorMessage("Please enter your Shopify store URL.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    
      // Call the validation API with store name and company ID
      const response = await fetch("/api/company-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          companyId: companyId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store exists and validation successful
        console.log("Store validated successfully:", data);
        
        fetch(`/api/encrypt-store-id?shop=${data.shop}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.encryptedId) {
              localStorage.setItem("storeToken", data.encryptedId);
              console.log("Encrypted store id saved to localStorage ✅");
            } else {
              console.warn("No encrypted id returned:", data);
            }
          })
          .catch((err) => console.error("Error fetching encrypted id:", err));
        
        // Route based on phone number availability
        if (data.phonenumber) {
          // Phone number exists, redirect to configuration page
          router.push("/ConfigurationForm");
        } else {
          // No phone number, redirect to connect WhatsApp page
          router.push("/ConnectWhatsApp");
        }
      } else if (response.status === 404 && data.redirectUrl) {
        // Company not found during connect store, redirect to the provided URL
        console.log("Company not found during store connection, redirecting to:", data.redirectUrl);
        window.location.href = data.redirectUrl;
        return;
      } else {
        // Handle other error cases
        setErrorMessage(data.message || "An error occurred while connecting the store.");
      }
     }
    
    } catch (error) {
      console.error("Error validating store:", error);
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
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
    <div className="font-source-sans min-h-screen bg-white px-4 py-10 flex flex-col items-center">
      {/* Header Section */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/wp_icon.svg"
            alt="wp icon"
            height={100}
            width={100}
            className="w-[36px] h-[36px]"
          />
        </div>
        <h1 className="text-2xl text-[#1A1A1A] md:text-3xl font-bold mb-2">
          Welcome to MyOperator for Shopify
        </h1>
        <p className="text-[#333333] text-[14px] md:text-base">
          Transform your Shopify store with integrated WhatsApp messaging and
          telephony solutions. Boost sales, enhance customer experience, and
          streamline communications.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-6xl items-start justify-between">
        {/* Left Features Section */}
        <div className="w-full md:w-1/2">
          <h2 className="text-[18px] text-[#1A1A1A] font-semibold mb-6">
            Everything you need to grow your business
          </h2>
          <ul className="space-y-6">
            {[
              {
                title: "Automated WhatsApp Messages",
                desc: "Connect with customers on their favorite messaging platform",
                icon: (
                  <Image
                    src="/assets/first_icon.svg"
                    alt="first icon"
                    height={100}
                    width={100}
                    className="h-[37px] w-[37px]"
                  />
                ),
              },
              {
                title: "Smart Automations",
                desc: "Automate order updates, cart recovery, and customer support",
                icon: (
                  <Image
                    src="/assets/second_icon.svg"
                    alt="second icon"
                    height={100}
                    width={100}
                    className="h-[37px] w-[37px]"
                  />
                ),
              },
              {
                title: "Team Collaboration",
                desc: "Shared inbox & conversation management",
                icon: (
                  <Image
                    src="/assets/third_icon.svg"
                    alt="third icon"
                    height={100}
                    width={100}
                    className="h-[37px] w-[37px]"
                  />
                ),
              },
              {
                title: "Analytics & Insights",
                desc: "Track performance and optimize your customer engagement",
                icon: (
                  <Image
                    src="/assets/fourth_icon.svg"
                    alt="fourth icon"
                    height={100}
                    width={100}
                    className="h-[37px] w-[37px]"
                  />
                ),
              },
              {
                title: "Shopify Integration",
                desc: "Seamless data sync & workflows",
                icon: (
                  <Image
                    src="/assets/fifth_icon.svg"
                    alt="fifth icon"
                    height={100}
                    width={100}
                    className="h-[37px] w-[37px]"
                  />
                ),
              },
            ].map((item, i) => (
              <li key={i} className="flex items-start space-x-4">
                <div>{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-[14px] text-[#1A1A1A]">
                    {item.title}
                  </h3>
                  <p className="text-[#999999] text-[12px]">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Form Card */}
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto w-full">
            <div className="flex flex-col items-center text-center mb-6">
              <Image
                src="/assets/store.svg"
                alt="store"
                height={100}
                width={100}
                className="h-[60px] w-[62px]"
              />
              <h2 className="text-[20px] mt-3 text-[#1A1A1A] font-semibold">
                Connect your Shopify store
              </h2>
              <p className="text-[#333333] text-[14px] mt-1">
                {isStoreReadonly 
                  ? "Your Shopify store has been automatically detected"
                  : "Enter your Shopify store URL to begin the installation process"
                }
              </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <label
                htmlFor="storeUrl"
                className="block text-[12px] text-left mt-5 text-[#333333] mb-1"
              >
                Store URL {isStoreReadonly && <span className="text-green-600">(Auto-detected)</span>}
              </label>
              <div className="relative">
                <Image
                  src="/assets/cart.svg"
                  alt="cart"
                  height={100}
                  width={100}
                  className="h-[12px] w-[12px] absolute top-3 left-3 z-10"
                />
                <input
                  id="storeUrl"
                  type="text"
                  value={StoreName}
                  onChange={(e) => !isStoreReadonly && setStoreName(e.target.value)}
                  placeholder="your_store.shopify.com"
                  readOnly={isStoreReadonly}
                  className={`w-full px-4 py-2 border pl-8 border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isStoreReadonly ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <p className="text-[12px] text-[#1A1A1A] mt-1 mb-4">
                {isStoreReadonly 
                  ? "This store URL was automatically detected from your account"
                  : "Enter a valid Shopify store URL (e.g., your-store.myshopify.com)"
                }
              </p>

              {/* Token Status Indicator */}
              {isTokenValid && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-600 text-sm">✅ Authentication verified</p>
                  {companyId && <p className="text-green-600 text-xs">Company ID: {companyId}</p>}
                  {isStoreReadonly && <p className="text-green-600 text-xs">🏪 Store auto-detected</p>}
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectStore}
                className="w-full bg-[#343E55] mt-3 text-white py-2 rounded-md hover:bg-gray-800 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Connecting..." : "Connect Store"}
              </button>
              <p className="text-center text-xs text-[#999999] mt-3">
                Setup takes less than 5 minutes
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}