"use client";

const API_BASE_URL = "/api"; // Change this to your actual base API URL

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("Token");
  }
  return null;
};

export const GET = async (endpoint) => {
  try {
    const token = getToken(); // Get token only on the client

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const POST = async (endpoint, data, isFormData = false) => {
  try {
    const token = getToken(); // Get token only on the client

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: isFormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("Token");
        localStorage.removeItem("Customer");
        window.location.href = "/login";
      }
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};
