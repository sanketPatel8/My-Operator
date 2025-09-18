// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import ClockLoader from "react-spinners/ClockLoader";

// export default function OrderConfirmationClient() {
//   const hasRun = useRef(false);
//   const [status, setStatus] = useState("Processing your order... ⏳");
//   const [loading, setLoading] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [modalMessage, setModalMessage] = useState("");
//   const searchParams = useSearchParams();

//   const confirmed = searchParams?.get("confirmed"); // "yes" or "no"
//   const order_id = searchParams?.get("order_id");

//   const sendConfirmation = async (statusValue) => {
//     try {
//       setLoading(true);
//       const response = await fetch("/api/place-order", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ orderId: order_id, status: statusValue }),
//       });

//       if (!response.ok) throw new Error("API failed");

//       const data = await response.json();

//       if (data.success) {
//         setStatus(
//           statusValue === "yes" ? "Order confirmed! 🎉" : "Order canceled ❌"
//         );
//         setLoading(false);
//         window.close(); // optional
//       } else {
//         setStatus("Order failed ❌");
//         setLoading(false);
//       }
//     } catch (error) {
//       console.error(error);
//       setStatus("Error processing your order ❌");
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (hasRun.current) return;
//     hasRun.current = true;

//     if (!order_id) {
//       setStatus("Order ID missing ❌");
//       return;
//     }

//     if (confirmed) {
//       const msg =
//         confirmed === "yes"
//           ? "Are you sure you want to confirm this order?"
//           : "Are you sure you want to cancel this order?";
//       setModalMessage(msg);
//       setIsModalOpen(true);
//     } else {
//       setModalMessage("Do you want to approve or cancel this order?");
//       setIsModalOpen(true);
//     }
//   }, [confirmed, order_id]);

//   return (
//     <div className="flex h-screen justify-center items-center">
//       {loading && (
//         <ClockLoader
//           color="#36d7b7"
//           loading={loading}
//           size={50}
//           aria-label="Loading Spinner"
//         />
//       )}

//       {isModalOpen && !loading && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
//           <div className="bg-white p-6 rounded shadow-md w-80 text-center">
//             <h3 className="text-lg font-bold mb-4">{modalMessage}</h3>
//             <div className="flex justify-center gap-4">
//               <button
//                 onClick={() => {
//                   setIsModalOpen(false);
//                   sendConfirmation("yes");
//                 }}
//                 className="bg-green-500 text-white px-4 py-2 rounded"
//               >
//                 Yes
//               </button>
//               <button
//                 onClick={() => {
//                   setIsModalOpen(false);
//                   sendConfirmation("no");
//                 }}
//                 className="bg-red-500 text-white px-4 py-2 rounded"
//               >
//                 No
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {!loading && !isModalOpen && status && (
//         <div className="text-center p-4">
//           <p>{status}</p>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ClockLoader from "react-spinners/ClockLoader";

export default function OrderConfirmationClient() {
  const hasRun = useRef(false);
  const [status, setStatus] = useState("Processing your order... ⏳");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const searchParams = useSearchParams();

  const confirmed = searchParams?.get("confirmed"); // "yes" or "no"
  const order_id = searchParams?.get("order_id");

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
        // ✅ Success → close the tab
        window.close();
      } else {
        // ❌ Failure → show error
        setStatus("Order failed ❌");
      }
    } catch (error) {
      console.error(error);
      setStatus("Error processing your order ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!order_id) {
      setStatus("Order ID missing ❌");
      return;
    }

    if (confirmed) {
      const msg =
        confirmed === "yes"
          ? "Are you sure you want to confirm this order?"
          : "Are you sure you want to cancel this order?";
      setModalMessage(msg);
      setIsModalOpen(true);
    } else {
      setModalMessage("Do you want to approve or cancel this order?");
      setIsModalOpen(true);
    }
  }, [confirmed, order_id]);

  return (
    <div className="flex h-screen justify-center items-center">
      {loading && (
        <ClockLoader
          color="#36d7b7"
          loading={loading}
          size={50}
          aria-label="Loading Spinner"
        />
      )}

      {isModalOpen && !loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-80 text-center">
            <h3 className="text-lg font-bold mb-4">{modalMessage}</h3>
            <div className="flex justify-center gap-4">
              {/* Yes → call API */}
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  sendConfirmation("yes");
                }}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Yes
              </button>

              {/* No → close tab directly */}
              <button
                onClick={() => {
                  window.close();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !isModalOpen && status && (
        <div className="text-center p-4">
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
