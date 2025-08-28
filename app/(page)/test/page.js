"use client";

import { useEffect, useState } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/receive-customers", {
          method: "GET", // we'll adjust the API route to support GET
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Customers</h1>
      <ul>
        {customers.map((c) => (
          <li key={c.id}>
            {c.first_name} {c.last_name} ({c.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
