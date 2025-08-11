// /app/api/shopify/orders/route.js
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const SHOP = "sanket-store01.myshopify.com";
    const TOKEN = "shpua_6983afa24c78e5bb4a75d7ba394d8f8e"; // ⚠️ Keep this secret in production
    const API_VERSION = "2024-04";

    // ✅ Modified query: removed protected fields like `email`
    const query = `
    {
      orders(first: 5) {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 10) {
              edges {
                node {
                  name
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const res = await fetch(
      `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    // ⚠️ If HTTP response is not OK
    if (!res.ok) {
      const errText = await res.text();
      console.error("Shopify API error:", errText);
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();

    // 🐛 Check for GraphQL errors
    if (data.errors) {
      console.error("GraphQL Errors:", data.errors);
      return NextResponse.json({ error: data.errors }, { status: 500 });
    }

    // ✅ Safe access to orders
    const orders = data?.data?.orders?.edges?.map((edge) => edge.node) || [];

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Fetch orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
