"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ConnectShopif() {
  const router = useRouter();

  const [StoreName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch shop from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const shopParam = params.get("shop");

      if (shopParam) { 
        setStoreName(shopParam);

        // 🔹 Call backend to fetch encrypted id
        fetch(`/api/encrypt-store-id?shop=${shopParam}`)
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
      }
    }
  }, []);

  // Validate store exists in database
  const handleConnectStore = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
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
        // Store exists, proceed to next page
        console.log("Store validated successfully:", data);
        router.push("/ConfigureWhatsApp");
      } else {
        // Store doesn't exist or other error
        if (response.status === 404) {
          setErrorMessage("Store not found in our database. Please reinstall app and try again.");
        } else if (response.status === 401) {
          setErrorMessage("Invalid store token. Please reinstall app and try again.");
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
                    alt="first icon"
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
                    alt="first icon"
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
                    alt="first icon"
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
                    alt="first icon"
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
                  <h3 className="font-semibold text-[14px]  text-[#1A1A1A]">
                    {item.title}
                  </h3>
                  <p className="text-[#999999] text-[12px] text-sm">
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
              <Image
                src="/assets/cart.svg"
                alt="cart"
                height={100}
                width={100}
                className="h-[12px] w-[12px] absolute mt-3 ml-3"
              />
              <input
                id="storeUrl"
                type="text"
                value={StoreName}
                readOnly
                placeholder="your_store.shopify.com"
                className="w-full px-4 py-2 border pl-8 border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[12px] text-[#1A1A1A] mt-1 mb-4">
                Enter a valid Shopify store URL (e.g., your-store.myshopify.com)
              </p>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectStore}
                disabled={isLoading || !StoreName}
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