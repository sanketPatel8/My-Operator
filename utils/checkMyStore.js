export async function checkMyStore(storeToken) {
  try {
    const res = await fetch("/api/check-store", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storeToken }),
      cache: "no-store",
    });

    // Convert response body to JSON
    const data = await res.json();

    // 🔥 Condition — check the API status
    if (data?.status === true) {
      return { ok: true, data };
    } else {
      // ❌ status is false → redirect
      window.location.href = "/";
      return { ok: false };
    }
  } catch (err) {
    console.error("checkMyStore error:", err);
    window.location.href = "/";
    return { error: true };
  }
}
