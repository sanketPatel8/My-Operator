export async function sendAbandonedCartEmail(checkout, step) {
  let subject, message;

  if (step === 1) {
    subject = "🛒 [Reminder 1] You left something in your cart!";
    message = `Hi ${checkout.customer_first_name || "Customer"}, 
    Please return to complete your order: ${checkout.abandoned_checkout_url}`;
  } else if (step === 2) {
    subject = "⏰ [Reminder 2] Your cart is still waiting!";
    message = `Hi ${checkout.customer_first_name || "Customer"}, 
    Don’t miss out – finish your checkout: ${checkout.abandoned_checkout_url}`;
  } else {
    subject = "🔥 [Reminder 3] Last chance to complete your order!";
    message = `Hi ${checkout.customer_first_name || "Customer"}, 
    This is your final reminder. Complete your order now: ${
      checkout.abandoned_checkout_url
    }`;
  }

  // 👉 Instead of sending email, just log it
  console.log("====================================");
  console.log("📧 Abandoned Cart Reminder Triggered");
  console.log("Customer:", checkout.email);
  console.log("Step:", step);
  console.log("Subject:", subject);
  console.log("Message:", message);
  console.log("====================================");
}
