import OrderConfirmationClient from "@/component/OrderConfirmationClient";
import { Suspense } from "react";

export default function Page() {
    
  return (
    <Suspense fallback={<div></div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
