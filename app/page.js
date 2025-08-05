"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [shop, setShop] = useState("");

  const handleInstall = async () => {
    if (!shop)
      return alert("Enter your shop name (e.g. mystore.myshopify.com)");

    window.location.href = `/api/shopify/install?shop=${shop}`;
  };
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1>Shopify App Setup</h1>
        <input
          type="text"
          placeholder="yourstore.myshopify.com"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          className="border border-gray-400 p-2 rounded"
        />
        <button
          onClick={handleInstall}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Install Shopify App
        </button>
      </main>
    </div>
  );
}
