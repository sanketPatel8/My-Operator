"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function ConnectShopify() {
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  const [StoreName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [StatusMessage, setStatusMessage] = useState("");

  const [isStoreReadonly, setIsStoreReadonly] = useState(false);
  const [SecondLogin, setSecondLogin] = useState(false);

  const [redirectPath, setRedirectPath] = useState(null);
  const [isExternalRedirect, setIsExternalRedirect] = useState(false);
  const [GenratedStoreToken, setGenratedStoreToken] = useState(null);
  const [TokenUpdated, setTokenUpdated] = useState(false);
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get("token");
  const shopParam = searchParams.get("shop");

  useEffect(() => {
    if (!shopParam && !tokenParam) {
      setStatusMessage(
        "❌ Missing authorization details. Please re-install or re-authorize the app."
      );
    }
  }, [tokenParam, shopParam]);

  useEffect(() => {
    if (loading && redirectPath) {
      if (isExternalRedirect) {
        window.location.href = redirectPath;
        setIsLoading(false);
      } else {
        router.push(redirectPath);
        setIsLoading(false);
      }
    }
  }, [loading, redirectPath, isExternalRedirect, router]);

  // Get token from URL and verify it

  const init = async (Token) => {
    if (typeof window !== "undefined") {
      try {

        if (tokenParam) {
          const isValid = await verifyToken(tokenParam);
          if (!isValid) {
            setErrorMessage("Invalid or expired token. Please try again.");
          }
        }

        if (shopParam == null) {
          setSecondLogin(true);
        }

        if (shopParam) {
          setStoreName(shopParam);
          const res = await fetch(`/api/encrypt-store-id?shop=${shopParam}`);
          const data = await res.json();

          if (data.encryptedId) {
            setGenratedStoreToken(data.encryptedId);
            localStorage.setItem("storeToken", data.encryptedId);
            setTokenUpdated(true);
          } else {
            console.warn("No encrypted id returned:", data);
          }
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        // Don't set loading to false if shopParam exists (will be handled by validateStoreAndRoute)
        if (!shopParam) {
          setLoading(false);
        }
      }
    }
  };

  const getCompanyStore = async (companyId) => {
    try {
      setLoading(true);

      const response = await fetch("/api/company-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (response.ok) {

        // Encrypt store
        const encryptResponse = await fetch(
          `/api/encrypt-store-id?shop=${data.shop}`
        );
        const encryptData = await encryptResponse.json();

        if (encryptData.encryptedId) {
          localStorage.setItem("storeToken", encryptData.encryptedId);
        } else {
          console.warn("No encrypted id returned:", encryptData);
        }

        // Set redirect path and keep loading state for smooth transition
        if (data.phonenumber) {
          router.push("/workflowlist");
          setIsRedirecting(true);
          return;
        } else {
          router.push("/ConnectWhatsApp");
          setIsRedirecting(true);
          return;
        }
      }

      if (response.ok && data.shop) {
        setStoreName(data.shop);
        setIsStoreReadonly(true);
      } else if (response.status === 404 && data.redirectUrl) {
        setIsRedirecting(true);
        window.location.href = data.redirectUrl;
        setIsExternalRedirect(true);
        return;
      } else {
        setIsStoreReadonly(false);
      }
    } catch (error) {
      console.error("Error fetching company store:", error);
      setIsStoreReadonly(false);
    } finally {
      // Only set loading to false if we're not redirecting
      if (!redirectPath) {
        setLoading(false);
      }
      setSecondLogin(false);
    }
  };

  // Get company store after companyId is set
  useEffect(() => {
    const fetchStore = async () => {
      if (companyId && isTokenValid) {
        try {
          await getCompanyStore(companyId);
        } finally {
        }
      }
    };
    fetchStore();
  }, [companyId, isTokenValid]);

  const validateStoreAndRoute = async () => {
    if (shopParam && !isRedirecting) {
      try {
        // const storeToken = localStorage.getItem("storeToken");
        const storeToken = GenratedStoreToken;

        if (!storeToken) {
          console.warn("⚠️ No store token found in localStorage");
          setIsRedirecting(true);
          setRedirectPath(process.env.NEXT_PUBLIC_REDIRECT_URL);
          setIsExternalRedirect(true);
          return;
        }

        // Call the validation API
        const response = await fetch("/api/store-phone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storeToken }),
        });

        const data = await response.json();

        if (response.ok) {

          setIsRedirecting(true);
          // Keep loading true to prevent screen from showing
          setLoading(true);

          const validCompnyID = !data.company_id;
          const validPhoneNumber = !data.phone_number_id;


          if (validCompnyID && validPhoneNumber) {
            // setRedirectPath("/");
            setIsRedirecting(false);
            setLoading(false);
          } else if (!validCompnyID && !validPhoneNumber) {
            setRedirectPath("/workflowlist");
          } else if (!validCompnyID && validPhoneNumber) {
            setRedirectPath("/ConnectWhatsApp");
          } else if (validCompnyID && !validPhoneNumber) {
          }
        } else {
          setErrorMessage(data.message || "Failed to validate store");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error validating store:", error);
        setErrorMessage(
          "Network error. Please check your connection and try again."
        );
        setLoading(false);
      }
    }
  };

  // NEW: Handle shopParam store validation and routing
  useEffect(() => {
    if (GenratedStoreToken) {
      validateStoreAndRoute();
    }
  }, [shopParam, isRedirecting, GenratedStoreToken]);

  // Function to verify JWT token
  const verifyToken = async (token) => {
    try {
      const response = await fetch("/api/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsTokenValid(true);
        setCompanyId(data.companyId);
        setStatusMessage(
          "✅ Authorization successful. Redirecting you to your dashboard..."
        );

        return true;
      } else {
        console.error("Token verification failed:", data);
        setIsTokenValid(false);
        setStatusMessage(
          "❌ Authorization failed. Please re-install or re-authorize the app."
        );
        return false;
      }
    } catch (error) {
      console.error("Token verification request failed:", error);
      setIsTokenValid(false);
      return false;
    }
  };

  // Simplified handleConnectStore - now only for manual button clicks (no shopParam)
  const handleConnectStore = async () => {
    // Handle manual store connection (no shopParam flow)

    setLoading(true);

    try {
      router.push("/ConfigureWhatsApp");
    } catch (error) {
      console.error("Error connecting store:", error);
      setErrorMessage("Failed to connect store");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!TokenUpdated && !GenratedStoreToken) {
      init();
    }

  }, [tokenParam, shopParam, TokenUpdated, GenratedStoreToken]);

  if (isRedirecting || loading) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isRedirecting ? "Redirecting..." : "Loading..."}
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (SecondLogin) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              {tokenParam && shopParam && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              )}

              <p className="text-gray-600">{StatusMessage}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="font-source-sans min-h-screen bg-white px-4 py-10 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-2xl">
          <div className="flex justify-center mb-4">
            <Image
              src="/assets/wp_icon.svg"
              alt="wp icon"
              height={100}
              width={100}
              className="w-[36px] h-[36px]"
            />
          </div>
          <h1 className="text-2xl text-[#1A1A1A] md:text-3xl font-bold mb-2">
            Welcome to MyOperator for Shopify
          </h1>
          <p className="text-[#333333] text-[14px] md:text-base">
            Transform your Shopify store with integrated WhatsApp messaging and
            telephony solutions. Boost sales, enhance customer experience, and
            streamline communications.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-10 w-full max-w-6xl items-start justify-between">
          {/* Left Features Section */}
          <div className="w-full md:w-1/2">
            <h2 className="text-[18px] text-[#1A1A1A] font-semibold mb-6">
              Everything you need to grow your business
            </h2>
            <ul className="space-y-6">
              {[
                {
                  title: "Automated WhatsApp Messages",
                  desc: "Connect with customers on their favorite messaging platform",
                  icon: (
                    <Image
                      src="/assets/first_icon.svg"
                      alt="first icon"
                      height={100}
                      width={100}
                      className="h-[37px] w-[37px]"
                    />
                  ),
                },
                {
                  title: "Smart Automations",
                  desc: "Automate order updates, cart recovery, and customer support",
                  icon: (
                    <Image
                      src="/assets/second_icon.svg"
                      alt="second icon"
                      height={100}
                      width={100}
                      className="h-[37px] w-[37px]"
                    />
                  ),
                },
                {
                  title: "Team Collaboration",
                  desc: "Shared inbox & conversation management",
                  icon: (
                    <Image
                      src="/assets/third_icon.svg"
                      alt="third icon"
                      height={100}
                      width={100}
                      className="h-[37px] w-[37px]"
                    />
                  ),
                },
                {
                  title: "Analytics & Insights",
                  desc: "Track performance and optimize your customer engagement",
                  icon: (
                    <Image
                      src="/assets/fourth_icon.svg"
                      alt="fourth icon"
                      height={100}
                      width={100}
                      className="h-[37px] w-[37px]"
                    />
                  ),
                },
                {
                  title: "Shopify Integration",
                  desc: "Seamless data sync & workflows",
                  icon: (
                    <Image
                      src="/assets/fifth_icon.svg"
                      alt="fifth icon"
                      height={100}
                      width={100}
                      className="h-[37px] w-[37px]"
                    />
                  ),
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-4">
                  <div>{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-[14px] text-[#1A1A1A]">
                      {item.title}
                    </h3>
                    <p className="text-[#999999] text-[12px]">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Form Card */}
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto w-full">
              <div className="flex flex-col items-center text-center mb-6">
                <Image
                  src="/assets/store.svg"
                  alt="store"
                  height={100}
                  width={100}
                  className="h-[60px] w-[62px]"
                />
                <h2 className="text-[20px] mt-3 text-[#1A1A1A] font-semibold">
                  Connect your Shopify store
                </h2>
                <p className="text-[#333333] text-[14px] mt-1">
                  {isStoreReadonly
                    ? "Your Shopify store has been automatically detected"
                    : "Enter your Shopify store URL to begin the installation process"}
                </p>
              </div>

              <form onSubmit={(e) => e.preventDefault()}>
                <label
                  htmlFor="storeUrl"
                  className="block text-[12px] text-left mt-5 text-[#333333] mb-1"
                >
                  Store URL{" "}
                  {isStoreReadonly && (
                    <span className="text-green-600">(Auto-detected)</span>
                  )}
                </label>
                <div className="relative">
                  <Image
                    src="/assets/cart.svg"
                    alt="cart"
                    height={100}
                    width={100}
                    className="h-[12px] w-[12px] absolute top-3 left-3 z-10"
                  />
                  <input
                    id="storeUrl"
                    type="text"
                    value={StoreName}
                    onChange={(e) =>
                      !isStoreReadonly && setStoreName(e.target.value)
                    }
                    placeholder="your_store.shopify.com"
                    readOnly={isStoreReadonly}
                    className={`w-full px-4 py-2 border pl-8 border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isStoreReadonly ? "bg-gray-50 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <p className="text-[12px] text-[#1A1A1A] mt-1 mb-4">
                  {isStoreReadonly
                    ? "This store URL was automatically detected from your account"
                    : "Enter a valid Shopify store URL (e.g., your-store.myshopify.com)"}
                </p>

                {/* Token Status Indicator */}
                {isTokenValid && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 text-sm">
                      ✅ Authentication verified
                    </p>
                    {isStoreReadonly && (
                      <p className="text-green-600 text-xs">
                        🏪 Store auto-detected
                      </p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConnectStore}
                  className="w-full bg-[#343E55] mt-3 text-white py-2 rounded-md hover:bg-gray-800 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Connecting..." : "Connect Store"}
                </button>
                <p className="text-center text-xs text-[#999999] mt-3">
                  Setup takes less than 5 minutes
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div></div>}>
      <ConnectShopify />
    </Suspense>
  );
}
