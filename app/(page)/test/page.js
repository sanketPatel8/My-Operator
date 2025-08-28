"use client";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
      const res = await fetch("/api/shopify/orders");
      const data = await res.json();
      console.log(data, "data");
      setOrders(data.orders);
    }
    fetchOrders();
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
