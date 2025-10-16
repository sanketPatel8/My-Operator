"use client";
import Link from 'next/link';
import React, { useState } from 'react';

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password does not match');
      return false;
    }

    if (formData.oldPassword === formData.newPassword) {
      setError('New password must be different from old password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully! Redirecting to login...');
      setFormData({
        email: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 2000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your credentials to reset your password</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={handleChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password (min 6 characters)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your new password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#343E55] text-white py-2 rounded-md hover:bg-gray-800 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <div className="text-center mt-1">
            <Link href="/admin/dashboard" className="text-sm text-[#343E55] hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}