"use client";
import { useEffect, useState } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch("/api/shopify/orders")
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  //   fetchOrders();

  return (
    <div>
      <h1>Shopify Customers</h1>
      <ul>
        {customers.map((c) => (
          <li key={c.id}>
            {c.displayName} - {c.email} - {c.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}
