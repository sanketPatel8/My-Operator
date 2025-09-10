// "use client";
// import { useEffect, useRef, useState } from "react";

// const OrderConfirmationPage = () => {
//   const hasRun = useRef(false); // prevent multiple executions
//   const [status, setStatus] = useState("Processing your order... ⏳");

//   useEffect(() => {
//     if (hasRun.current) return;
//     hasRun.current = true;

//     const sendConfirmation = async () => {
//       try {
//         const response = await fetch("/api/place-order", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ orderId: 123 }), // replace with real orderId
//         });

//         if (!response.ok) throw new Error("API failed");

//         const data = await response.json();

//         if (data.success) {
//           setStatus("Order confirmed! 🎉");

//           window.close();

//           // Open confirmation in hidden tab
//           //   const win = window.open(
//           //     `/order-confirmation?confirmed=yes`,
//           //     "_blank",
//           //     "width=1,height=1,left=-1000,top=-1000"
//           //   );

//           // close hidden window after 1s
//           //   setTimeout(() => {
//           //     if (win) win.close();
//           //   }, 1000);
//         } else {
//           setStatus("Order failed ❌");
//         }
//       } catch (error) {
//         console.error("Order API error:", error);
//         setStatus("Error processing your order ❌");
//       }
//     };

//     sendConfirmation();
//   }, []);

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

const OrderConfirmationPage = () => {
  const hasRun = useRef(false);
  const [status, setStatus] = useState("Processing your order... ⏳");
  const searchParams = useSearchParams();

  // Get confirmed value from query param
  const confirmed = searchParams.get("confirmed"); // "yes" or "no"
  const order_id = searchParams.get("order_id"); // "yes" or "no"

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const sendConfirmation = async (status) => {
      try {
        const response = await fetch("/api/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order_id, status: status }), // replace with real orderId
        });

        if (!response.ok) throw new Error("API failed");

        const data = await response.json();

        if (data.success) {
          setStatus("Order confirmed! 🎉");

          // Optional: Close current window if needed
          window.close();
        } else {
          setStatus("Order failed ❌");
        }
      } catch (error) {
        console.error("Order API error:", error);
        setStatus("Error processing your order ❌");
      }
    };

    // Only send confirmation if confirmed is "yes"
    if (confirmed === "yes" && order_id !== null) {
      sendConfirmation(confirmed);
    } else if (confirmed === "no" && order_id !== null) {
      //   setStatus("Order not confirmed ❌");
      sendConfirmation(confirmed);
    }
  }, [confirmed, order_id]);

  return (
    <div>
      <p>{status}</p>
    </div>
  );
};

export default OrderConfirmationPage;
