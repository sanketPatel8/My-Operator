"use client";

const API_BASE_URL = "/api"; // 🔹 Change this if you have an external API

// ✅ Helper: Get stored token
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("Token");
  }
  return null;
};

// ✅ GET Request
export const GET = async (endpoint, params = {}) => {
  try {
    const token = getToken();

    const query = new URLSearchParams(params).toString();
    const url = query
      ? `${API_BASE_URL}${endpoint}?${query}`
      : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
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

// ✅ POST Request
export const POST = async (endpoint, data, isFormData = false) => {
  try {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: isFormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};
