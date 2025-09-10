// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useSearchParams } from "next/navigation";

// const OrderConfirmationPage = () => {
//   const hasRun = useRef(false);
//   const [status, setStatus] = useState("Processing your order... ⏳");
//   const searchParams = useSearchParams();

//   // Get confirmed value from query param
//   const confirmed = searchParams.get("confirmed"); // "yes" or "no"
//   const order_id = searchParams.get("order_id"); // "yes" or "no"

//   useEffect(() => {
//     if (hasRun.current) return;
//     hasRun.current = true;

//     const sendConfirmation = async (status) => {
//       try {
//         const response = await fetch("/api/place-order", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ orderId: order_id, status: status }), // replace with real orderId
//         });

//         if (!response.ok) throw new Error("API failed");

//         const data = await response.json();

//         if (data.success) {
//           setStatus("Order confirmed! 🎉");

//           // Optional: Close current window if needed
//           window.close();
//         } else {
//           setStatus("Order failed ❌");
//         }
//       } catch (error) {
//         console.error("Order API error:", error);
//         setStatus("Error processing your order ❌");
//       }
//     };

//     // Only send confirmation if confirmed is "yes"
//     if (confirmed === "yes" && order_id !== null) {
//       sendConfirmation(confirmed);
//     } else if (confirmed === "no" && order_id !== null) {
//       //   setStatus("Order not confirmed ❌");
//       sendConfirmation(confirmed);
//     }
//   }, [confirmed, order_id]);

//   return (
//     <div>
//       <p>{status}</p>
//     </div>
//   );
// };

// export default OrderConfirmationPage;

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// Client component
function OrderConfirmationClient() {
  const hasRun = useRef(false);
  const [status, setStatus] = useState("Processing your order... ⏳");
  const searchParams = useSearchParams();

  const confirmed = searchParams?.get("confirmed"); // "yes" or "no"
  const order_id = searchParams?.get("order_id"); // actual order ID

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

          // Optional: close tab after 2s
          // setTimeout(() => window.close(), 2000);
        } else {
          setStatus("Order failed ❌");
        }
      } catch (error) {
        console.error("Order API error:", error);
        setStatus("Error processing your order ❌");
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

// Page export
export default function Page() {
  return <OrderConfirmationClient />;
}
