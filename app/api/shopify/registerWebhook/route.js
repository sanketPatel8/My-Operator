import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { shop, accessToken } = await request.json();

    const webhookUrl = `${process.env.APP_URL}/api/webhook-handler`; // tamaru webhook handle karva nu route
    const webhookTopic = "checkouts/create";

    const response = await fetch(
      `https://${shop}/admin/api/2024-04/webhooks.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic: webhookTopic,
            address: webhookUrl,
            format: "json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
