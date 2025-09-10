// This is a server component wrapper

// app/order-conformation/page.tsx

import OrderConfirmationClient from "@/component/OrderConfirmationClient";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
