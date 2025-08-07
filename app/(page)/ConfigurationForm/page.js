"use client";
// components/ConfigurationForm.js
import { useState } from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { PiStorefrontBold } from "react-icons/pi";

export default function ConfigurationForm() {
  const [edit, setEdit] = useState(false);
  const [formData, setFormData] = useState({
    brandName: "Brand name here",
    publicUrl: "https://www.arcmold3d.com/",
    shopUrl: "https://c1jaip-y0.myshopify.com",
    whatsapp: "+91 63563 63563",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="w-full pt-[14px] pl-[32px]  bg-white ">
      {/* Header */}
      <div className="mb-6 border-b border-[#E9E9E9]">
        <h2 className="text-2xl font-semibold text-gray-900">Configuration</h2>
        <p className="text-sm text-gray-500">Configure automation settings.</p>
      </div>

      {/* Connection Info */}
      <div className="bg-white border rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 shadow-sm">
        {/* Phone */}
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 p-3 rounded-full text-gray-700">
            <FaPhoneAlt />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Business phone number
            </h3>
            <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
          </div>
          <span className="ml-4 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
            Connected
          </span>
        </div>

        {/* Shopify */}
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 p-3 rounded-full text-gray-700">
            <PiStorefrontBold size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Shopify Store
            </h3>
            <p className="text-sm text-gray-500">your-store.myshopify.com</p>
          </div>
          <span className="ml-4 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
            Verified
          </span>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Account Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Brand name
            </label>
            <input
              name="brandName"
              disabled={!edit}
              value={formData.brandName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md bg-gray-100 p-2.5 text-sm"
              placeholder="Brand name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Public shop Url
            </label>
            <input
              name="publicUrl"
              disabled={!edit}
              value={formData.publicUrl}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md bg-gray-100 p-2.5 text-sm"
              placeholder="Public shop URL"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Shop Url
            </label>
            <input
              name="shopUrl"
              disabled={!edit}
              value={formData.shopUrl}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md bg-gray-100 p-2.5 text-sm"
              placeholder="Shop URL"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              WhatsApp number
            </label>
            <input
              name="whatsapp"
              disabled={!edit}
              value={formData.whatsapp}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md bg-gray-100 p-2.5 text-sm"
              placeholder="WhatsApp Number"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-end">
          {edit ? (
            <>
              <button
                onClick={() => setEdit(false)}
                className="px-5 py-2 text-sm border border-gray-300 rounded-md mr-3"
              >
                Cancel
              </button>
              <button
                onClick={() => setEdit(false)}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md"
              >
                Save changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEdit(true)}
              className="px-6 py-2.5 text-sm bg-slate-800 text-white rounded-md"
            >
              Edit information
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
