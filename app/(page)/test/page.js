"use client";

import React from "react";

const TestPage = () => {
  const handleClick = () => {
    // Ask for confirmation
    const confirmed = window.confirm("Do you want to confirm the order?"); // returns true/false

    if (!confirmed) {
      alert("Order not confirmed!");
      return;
    }

    // Ask for order ID
    const orderId = window.prompt("Enter the Order ID:");
    if (!orderId) {
      alert("Order ID is required!");
      return;
    }

    // Open new tab with query parameters
    const url = `${process.env.NEXT_PUBLIC_URL}/order-conformation?confirmed=no&order_id=${orderId}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Click to verify
      </button>
    </div>
  );
};

export default TestPage;
