// "use client"; // must be at the top for client component
// import { useEffect } from "react";

// const OrderConfirmationPage = ({ orderConfirmed }) => {
//   useEffect(() => {
//     // orderConfirmed should be "yes" or "no"
//     const url = `/hidden-action-page?confirmed=${orderConfirmed}`;

//     const win = window.open(url, "_blank", "width=1,height=1");

//     setTimeout(() => {
//       if (win) win.close();
//     }, 1000);
//   }, [orderConfirmed]);

//   return <div>Processing your order...</div>;
// };

// export default OrderConfirmationPage;

"use client";
import { useEffect, useRef, useState } from "react";

const OrderConfirmationPage = () => {
  const hasRun = useRef(false); // prevent multiple executions
  const [status, setStatus] = useState("Processing your order... ⏳");

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const sendConfirmation = async () => {
      try {
        const response = await fetch("/api/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: 123 }), // replace with real orderId
        });

        if (!response.ok) throw new Error("API failed");

        const data = await response.json();

        if (data.success) {
          setStatus("Order confirmed! 🎉");

          window.close();

          // Open confirmation in hidden tab
          //   const win = window.open(
          //     `/order-confirmation?confirmed=yes`,
          //     "_blank",
          //     "width=1,height=1,left=-1000,top=-1000"
          //   );

          // close hidden window after 1s
          //   setTimeout(() => {
          //     if (win) win.close();
          //   }, 1000);
        } else {
          setStatus("Order failed ❌");
        }
      } catch (error) {
        console.error("Order API error:", error);
        setStatus("Error processing your order ❌");
      }
    };

    sendConfirmation();
  }, []);

  return (
    <div>
      <p>{status}</p>
    </div>
  );
};

export default OrderConfirmationPage;
