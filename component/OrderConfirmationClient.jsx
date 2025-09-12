"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OrderConfirmationClient() {
  const hasRun = useRef(false);
  const [status, setStatus] = useState("Processing your order... ⏳");
  const searchParams = useSearchParams();

  const confirmed = searchParams?.get("confirmed"); // "yes" or "no"
  const order_id = searchParams?.get("order_id");

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!order_id) {
      setStatus("Order ID missing ❌");
      return;
    }

    const sendConfirmation = async (statusValue) => {
      try {
        const response = await fetch("/api/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order_id, status: statusValue }),
        });

        if (!response.ok) throw new Error("API failed");

        const data = await response.json();

        if (data.success) {
          setStatus(
            statusValue === "yes"
              ? "Order confirmed! 🎉"
              : "Order not confirmed ❌"
          );
          window.close();
        } else {
          setStatus("Order failed ❌");
          window.close();
        }
      } catch (error) {
        console.error(error);
        setStatus("Error processing your order ❌");
      } finally {
        window.close();
      }
    };

    if (confirmed) sendConfirmation(confirmed);
  }, [confirmed, order_id]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Order Confirmation</h1>
      <p>{status}</p>
      <p>
        <strong>Order ID:</strong> {order_id || "N/A"}
      </p>
      <p>
        <strong>Confirmed:</strong> {confirmed || "N/A"}
      </p>
    </div>
  );
}
