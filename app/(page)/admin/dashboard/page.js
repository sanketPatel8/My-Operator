"use client";
import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';

// Simple in-memory storage that persists during session
const AuthStorage = {
  token: null,
  setToken: (token) => {
    AuthStorage.token = token;
    // Also store in sessionStorage for page refresh persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_token', token);
    }
  },
  getToken: () => {
    if (!AuthStorage.token && typeof window !== 'undefined') {
      AuthStorage.token = sessionStorage.getItem('auth_token');
    }
    return AuthStorage.token;
  },
  clearToken: () => {
    AuthStorage.token = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
    }
  }
};

// Login Component
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Fixed credentials
    const FIXED_EMAIL = 'admin@gmail.com';
    const FIXED_PASSWORD = 'admin123';

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === FIXED_EMAIL && password === FIXED_PASSWORD) {
      // Generate a mock token
      const token = 'mock_token_' + Date.now();
      
      // Store token
      AuthStorage.setToken(token);
      onLogin(token);
    } else {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ token, onLogout }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Replace with your actual API URL
      const response = await fetch('/api/admin-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const result = await response.json();
      setData(result || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthStorage.clearToken();
    onLogout();
  };

  const columns = [
    {
      name: 'Shop',
      selector: row => row.shop,
      sortable: true,
      wrap: true,
    },
    {
      name: 'Country Code',
      selector: row => row.countrycode,
      sortable: true,
      width: '120px',
    },
    {
      name: 'Phone Number',
      selector: row => row.phonenumber,
      sortable: true,
      wrap: true,
    },
    {
      name: 'Brand Name',
      selector: row => row.brand_name,
      sortable: true,
      wrap: true,
    },
    {
      name: 'Shop URL',
      selector: row => row.public_shop_url,
      sortable: true,
      wrap: true,
    },
  ];

  const customStyles = {
    header: {
      style: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#1f2937',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
    headRow: {
      style: {
        backgroundColor: '#f3f4f6',
        borderBottomWidth: '2px',
        borderBottomColor: '#e5e7eb',
        fontWeight: '600',
      },
    },
    rows: {
      style: {
        fontSize: '14px',
        '&:hover': {
          backgroundColor: '#f9fafb',
          cursor: 'pointer',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading stores...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">Error loading data</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={fetchStores}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Retry
              </button>
            </div>
          ) : (
            <DataTable
              title="Store Information"
              columns={columns}
              data={data}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 20, 30, 50]}
              highlightOnHover
              customStyles={customStyles}
              responsive
              noDataComponent={
                <div className="py-12 text-center text-gray-500">
                  No stores found
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const existingToken = AuthStorage.getToken();
    if (existingToken) {
      // Verify token is valid (in real app, make API call to verify)
      verifyToken(existingToken);
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  const verifyToken = async (authToken) => {
    try {
      // Simulate token verification API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, you'd make an API call here to verify the token
      // For this demo, we'll assume the token is valid if it exists
      setToken(authToken);
      setIsAuthenticated(true);
    } catch (error) {
      // If token is invalid, clear it
      AuthStorage.clearToken();
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = (authToken) => {
    setToken(authToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}