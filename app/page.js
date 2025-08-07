"use client";

import { useEffect } from "react";
import ConnectShopify from "./(page)/ConnectShopify/page";

export default function Home() {
  useEffect(() => {
    fetch("/api/test-db")
      .then((res) => res.json())
      .then((data) => {
        console.log("DB time:", data.time);
      });
  }, []);

  return (
    <>
      <ConnectShopify />
    </>
  );
}
