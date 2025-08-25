// app/api/whatsapp-numbers/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {

  const baseUrl = process.env.NEXT_PUBLIC_BASEURL;
if (!baseUrl) {
  console.error('Environment variable NEXT_PUBLIC_BASEURL is not defined');
  return NextResponse.json(
    { message: 'Server configuration error', error: 'Base URL is not set in environment' },
    { status: 500 }
  );
}



  const apiUrl = `${baseUrl}/chat/phonenumbers?limit=10&offset=0&expand=waba_account`;
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer KIM7l16W0ijm6loVbaKoK4gsHJrrFt8LjceH9RyEna',
        'X-MYOP-COMPANY-ID': '5cd40f6554442586',
        'User-Agent': 'MyOperator-API-Client/1.0',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP Error ${response.status}`);
      console.error('API Error Response:', errorText);
      return NextResponse.json(
        {
          message: `API request failed: ${response.status} ${response.statusText}`,
          error: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from API');
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Request timeout', error: 'The API request took too long to respond', details: 'Please try again later' },
        { status: 408 }
      );
    }
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { message: 'Service unavailable', error: 'Could not connect to the WhatsApp API service', details: 'Please check your network and try again' },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: 'Failed to fetch WhatsApp numbers', error: error.message, details: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
