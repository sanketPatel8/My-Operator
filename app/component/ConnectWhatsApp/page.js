'use client';
import React from 'react'
import { useState } from 'react';
import Image from 'next/image';

const accounts = [
  {
    id: 'account1',
    name: 'My Store WhatsApp',
    phone: '+1234567890',
    status: 'Live',
    image: '/assets/profile.svg',
  },
  {
    id: 'account2',
    name: 'Business Account',
    phone: '+1234567890',
    status: 'Live',
    image: '/assets/profile.svg',
  },
  // You can add more accounts here...
];

function ConnectWhatsApp() {

    const [selectedAccount, setSelectedAccount] = useState(accounts[0].id);


  return (
    <div className="font-source-sans min-h-screen flex items-start justify-center bg-[#F9FBFF] px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6 mt-5 sm:p-8 lg:p-10 w-full max-w-md sm:max-w-lg lg:max-w-2xl">
        {/* Header */}
        <h2 className="text-xl sm:text-[24px] text-[#1A1A1A] font-semibold text-center mb-2">
          Connect WhatsApp Business API
        </h2>
        <p className="text-center text-[14px] text-[#333333] mb-6">
          Select your WhatsApp Business API account or link a new one
        </p>

        {/* Dynamic Options */}
        <div className="space-y-4">
          {accounts.map((account) => (
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
                <p className="text-[12px] text-[#333333] ">{account.name}</p>
                <p className="text-[14px] text-[#333333] ">{account.phone}</p>
              </div>
              <div className="text-green-500 text-sm font-medium sm:ml-auto">
                {account.status}
              </div>
            </label>
          ))}
        </div>

        {/* Link new */}
        <div className="mt-6">
            <button
                className="w-full border border-dashed border-[#E4E4E4] bg-[#FBFBFB] rounded-lg py-4 flex items-center justify-center text-[#4275D6] text-[14px] font-medium hover:underline"
            >
                <span className=" mr-1">＋</span> Link new WhatsApp account
            </button>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <button className="w-full sm:w-auto px-6 py-2 border rounded text-[#343E55] hover:bg-gray-100">
            Back
          </button>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="px-6 py-2 border rounded text-[#343E55] hover:bg-gray-100 w-full sm:w-auto">
              ⟳ Sync
            </button>
            <button className="px-6 py-2 bg-gray-800 text-[#FFFFFF] rounded hover:bg-gray-900 w-full sm:w-auto">
              Verify & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConnectWhatsApp