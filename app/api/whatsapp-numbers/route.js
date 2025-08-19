// File: app/api/whatsapp-numbers/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  const offset = searchParams.get('offset') || '0';
  const expand = searchParams.get('expand') || 'waba_account';

  try {
    const apiUrl = `https://publicapi.myoperator.co/chat/phonenumbers?limit=10&offset=0&expand=waba_account`;
    
    console.log('Making API request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer KIM7l16W0ijm6loVbaKoK4gsHJrrFt8LjceH9RyEna',
        'X-MYOP-COMPANY-ID': '5cd40f6554442586',
        'User-Agent': 'MyOperator-API-Client/1.0',
        'Content-Type': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP Error ${response.status} - ${response.statusText}`;
      }
      
      console.error('API Error Response:', errorText);
      
      return NextResponse.json(
        { 
          message: `API request failed: ${response.status} ${response.statusText}`,
          error: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('API Response success:', JSON.stringify(data, null, 2));
    
    // Validate the response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from API');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);
    
    // Handle different types of errors
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { 
          message: 'Request timeout',
          error: 'The API request took too long to respond',
          details: 'Please try again later'
        },
        { status: 408 }
      );
    }

    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          message: 'Service unavailable',
          error: 'Could not connect to the WhatsApp API service',
          details: 'Please check your network connection and try again'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Failed to fetch WhatsApp numbers',
        error: error.message,
        details: 'Internal server error occurred'
      },
      { status: 500 }
    );
  }
}

// Handle CORS for OPTIONS requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}