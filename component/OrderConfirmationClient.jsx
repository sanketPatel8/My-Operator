// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useSearchParams } from "next/navigation";

// export default function OrderConfirmationClient() {
//   const hasRun = useRef(false);
//   const [status, setStatus] = useState("Processing your order... ⏳");
//   const [Loading, setLoading] = useState(false);
//   const searchParams = useSearchParams();

//   const confirmed = searchParams?.get("confirmed"); // "yes" or "no"
//   const order_id = searchParams?.get("order_id");

//   useEffect(() => {
//     if (hasRun.current) return;
//     hasRun.current = true;

//     if (!order_id) {
//       setStatus("Order ID missing ❌");
//       return;
//     }

//     const sendConfirmation = async (statusValue) => {
//       try {
//         setLoading(true);
//         const response = await fetch("/api/place-order", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ orderId: order_id, status: statusValue }),
//         });

//         if (!response.ok) throw new Error("API failed");

//         const data = await response.json();

//         if (data.success) {
//           setStatus(
//             statusValue === "yes"
//               ? "Order confirmed! 🎉"
//               : "Order not confirmed ❌"
//           );
//           setLoading(false);
//           window.close();
//         } else {
//           setStatus("Order failed ❌");
//           setLoading(false);
//           window.close();
//         }
//       } catch (error) {
//         console.error(error);
//         setLoading(false);
//         setStatus("Error processing your order ❌");
//       } finally {
//         setLoading(false);
//         window.close();
//       }
//     };

//     if (confirmed) sendConfirmation(confirmed);
//   }, [confirmed, order_id]);

//   return (
//     <div style={{ padding: 20 }}>
//       {/* <h1>Order Confirmation</h1>
//       <p>{status}</p>
//       <p>
//         <strong>Order ID:</strong> {order_id || "N/A"}
//       </p>
//       <p>
//         <strong>Confirmed:</strong> {confirmed || "N/A"}
//       </p> */}
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ClockLoader from "react-spinners/ClockLoader"; // 🎯 react-spinner example

export default function OrderConfirmationClient() {
  const hasRun = useRef(false);
  const [status, setStatus] = useState("Processing your order... ⏳");
  const [loading, setLoading] = useState(false);
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
        setLoading(true);
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
        } else {
          setStatus("Order failed ❌");
        }
      } catch (error) {
        console.error(error);
        setStatus("Error processing your order ❌");
      } finally {
        setLoading(false);
        // window.close(); // optional, remove if you want user to see status
      }
    };

    if (confirmed) sendConfirmation(confirmed);
  }, [confirmed, order_id]);

  return (
    <div className="flex h-screen justify-center items-center">
      <ClockLoader
        color="#36d7b7"
        loading={loading}
        size={50}
        aria-label="Loading Spinner"
      />
      {/* <p style={{ marginTop: 20, fontSize: 18 }}>{status}</p>
      <p>
        <strong>Order ID:</strong> {order_id || "N/A"}
      </p>
      <p>
        <strong>Confirmed:</strong> {confirmed || "N/A"}
      </p> */}
    </div>
  );
}
