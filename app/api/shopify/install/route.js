// ✅ Shopify Install Route

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return new Response("❌ Missing shop parameter", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const redirectUri = `https://my-operator.vercel.app/api/shopify/callback`;
  const scopes = "read_products,write_orders,read_customers";
  const state = "secure123"; // Optional: ideally generate a dynamic state and store in DB/session

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  // console.log(installUrl, "installUrl");
  return Response.redirect(installUrl, 302);
}
