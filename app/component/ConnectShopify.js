"use client";

export default function ConnectShopify() {
  const handleClick = () => {
    const shop = prompt(
      "Enter your Shopify domain (e.g. sanket-store01.myshopify.com)"
    );

    if (!shop) return;

    const trimmedShop = shop.trim().toLowerCase();
    const isValid = /^[a-z0-9-]+\.myshopify\.com$/.test(trimmedShop);

    if (!isValid) {
      alert("⚠️ Invalid shop domain. Use format: sanket-store01.myshopify.com");
      return;
    }

    window.location.href = `/api/shopify/install?shop=${trimmedShop}`;
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "10px 20px",
        fontSize: "16px",
        backgroundColor: "white",
        color: "black",
        border: "1px solid #000",
        cursor: "pointer",
      }}
    >
      Connect Shopify Store
    </button>
  );
}
