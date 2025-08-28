"use client";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

//   useEffect(() => {
//   const fetchOrders = async () => {
//     try {
//       const res = await fetch("/api/shopify/orders");
//       const data = await res.json();
//       setOrders(data.orders);
//     } catch (err) {
//       console.error("Error fetching orders:", err);
//     }
//   };

//   fetchOrders(); // Initial fetch

//   const interval = setInterval(fetchOrders, 5000); // Every 5 seconds

//   return () => clearInterval(interval); // Cleanup
// }, []);

useEffect(() => {
  const eventSource = new EventSource("/api/shopify/stream");

  eventSource.onmessage = (event) => {
    const { type, order } = JSON.parse(event.data);
    if (type === "new-order") {
      setOrders(prev => [order, ...prev].slice(0, 50));
    }
  };

  return () => {
    eventSource.close();
  };
}, []);



  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Shopify Orders</h1>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.order_id} className="p-4 border rounded-lg shadow-sm">
              <p>
                <strong>Order ID:</strong> {o.order_id}
              </p>
              <p>
                <strong>Shop:</strong> {o.shop}
              </p>
              <p>
                <strong>Topic:</strong> {o.topic}
              </p>
              <pre className="bg-gray-100 p-2 mt-2 rounded">
                {JSON.stringify(JSON.parse(o.data), null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
