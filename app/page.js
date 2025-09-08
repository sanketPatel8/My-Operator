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

  // Get token from URL and verify it
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("token");

      if (tokenParam) {
        // Verify the token
        verifyToken(tokenParam)
          .then((isValid) => {
            if (!isValid) {
              setErrorMessage("Invalid or expired token. Please try again.");
            }
          })
          .catch((err) => {
            console.error("Token verification error:", err);
            setErrorMessage("Authentication failed. Please try again.");
          });
      } else {
        setErrorMessage("Authentication token is required.");
      }
    }
  }, []);

  // Function to verify JWT token
  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Removed invalid JWT headers - these belong in the token payload, not HTTP headers
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Token verified successfully:", data);
        setIsTokenValid(true);
        setCompanyId(data.companyId);
        
        // Store token info in localStorage
        localStorage.setItem("tokenInfo", JSON.stringify({
          companyId: data.companyId,
          issuedAt: data.issuedAt,
          expiresAt: data.expiresAt
        }));
        
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

  // Validate store exists in database
  const handleConnectStore = async () => {
    // Check if token is valid before proceeding
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

    try {
      // Call the validation API with store name and company ID
      const response = await fetch("/api/store-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          storeName: StoreName,
          companyId // Include company ID from token verification
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store exists, proceed to next page
        console.log("Store validated successfully:", data);
        router.push("/ConfigureWhatsApp");
      } else {
        // Store doesn't exist or other error
        if (response.status === 404) {
          setErrorMessage("Store not found in our database. Please check your store URL.");
        } else if (response.status === 401) {
          setErrorMessage("Invalid authentication. Please try again.");
        } else {
          setErrorMessage(data.message || "An error occurred while validating the store.");
        }
      }
    } catch (error) {
      console.error("Error validating store:", error);
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
                Enter your Shopify store URL to begin the installation process
              </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <label
                htmlFor="storeUrl"
                className="block text-[12px] text-left mt-5 text-[#333333] mb-1"
              >
                Store URL
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
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="your_store.shopify.com"
                  className="w-full px-4 py-2 border pl-8 border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[12px] text-[#1A1A1A] mt-1 mb-4">
                Enter a valid Shopify store URL (e.g., your-store.myshopify.com)
              </p>

              {/* Token Status Indicator */}
              {isTokenValid && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-600 text-sm">✅ Authentication verified</p>
                  {companyId && <p className="text-green-600 text-xs">Company ID: {companyId}</p>}
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
                disabled={isLoading || !isTokenValid}
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