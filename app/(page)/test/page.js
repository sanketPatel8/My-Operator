"use client";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  // useEffect(() => {
  //   const fetchInitialOrders = async () => {
  //     const res = await fetch("/api/shopify/orders");
  //     const data = await res.json();
  //     console.log("order data::", data);
      
  //     // setOrders(data.orders || []);
  //   };

  //   fetchInitialOrders();

  //   const eventSource = new EventSource("/api/shopify/stream");

  //   eventSource.onmessage = (event) => {
  //     const { type, order } = JSON.parse(event.data);
  //     console.log("order data::", order);

      
  //     if (type === "new-order") {
  //       setOrders((prev) => [order, ...prev].slice(0, 50)); // Keep latest 50
  //     }
  //   };

  //   eventSource.onerror = (err) => {
  //     console.error("SSE error:", err);
  //   };

  //   return () => {
  //     eventSource.close();
  //   };
  // }, []);

  useEffect(() => {
  const fetchOrders = async () => {
    const res = await fetch("/api/shopify/orders");
    const data = await res.json();
    console.log("Fetched orders:", data.orders); // 👈 Add this
    setOrders(data.orders);
  };

  fetchOrders();
  const interval = setInterval(fetchOrders, 3000); // every 3 seconds

  return () => clearInterval(interval);
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
