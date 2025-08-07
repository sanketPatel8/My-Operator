"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Suspense } from "react";

function ConfigureWhatsApp() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [CreatedCompanyID, setCreatedCompanyID] = useState("");

  // Get query params on page load
  // useEffect(() => {
  //   const shopParam = searchParams.get("shop");
  //   const tokenParam = searchParams.get("token");

  //   if (shopParam) setShop(shopParam);
  //   if (tokenParam) setToken(tokenParam);
  // }, [searchParams]);

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    const tokenParam = searchParams.get("token");

    if (shopParam) setShop(shopParam);

    if (tokenParam) {
      try {
        const decoded = btoa(tokenParam); // Decode token
        setToken(decoded);
      } catch (error) {
        console.error("Invalid token format");
      }
    }
  }, [searchParams]);

  // For debugging (can remove later)
  console.log("Shop:", shop, "Token:", token);

  return (
    <div className="font-source-sans min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md md:max-w-2xl bg-white shadow-md rounded-md p-6 md:p-8">
        <h2 className="text-xl md:text-[24px] text-[#1A1A1A] font-semibold text-center mb-2">
          Configure WhatsApp API details
        </h2>
        <p className="text-center text-[#333333] text-[14px] mb-6">
          Enter your WhatsApp Business API configuration details to establish
          the connection.
        </p>

        <div className="space-y-4 mt-8">
          {/* Company ID Field */}
          <div>
            <label className="block text-[12px] font-medium text-[#333333]">
              Company ID
            </label>
            <input
              type="text"
              value={CreatedCompanyID}
              onChange={(e) => setCreatedCompanyID(e.target.value)}
              placeholder="Enter your MyOperator company ID"
              className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Access Token Field */}
          <div>
            <label className="block mt-8 text-[12px] font-medium text-[#333333]">
              Access Token / API Key
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your access token"
              className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Help Info Box */}
          <div className="bg-blue-50 p-3 rounded-md text-[14px] text-[#4275D6] flex items-start md:items-center">
            <Image
              src="/assets/question-circle.svg"
              alt="question mark"
              height={100}
              width={100}
              className="h-[14px] w-[14px] mr-1"
            />
            <span className="text-[14px]">
              Need help finding your Company ID?&nbsp;
              <Link
                href="/component/ConnectShopify"
                className="text-[#4275D6] text-[14px] font-semibold underline"
              >
                Click here
              </Link>{" "}
              to know how
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-10">
            <button
              className="w-full sm:w-auto px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              onClick={() => window.history.back()}
            >
              Back
            </button>
            <button
              className="w-full sm:w-auto px-6 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
              onClick={() => {
                console.log("Submitted Data:", { shop, token });
                // Add form submission logic here
              }}
            >
              Verify & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfigureWhatsApp />
    </Suspense>
  );
}
