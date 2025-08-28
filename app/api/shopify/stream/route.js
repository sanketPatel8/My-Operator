// app/api/orders/stream/route.js
 
// In-memory clients
let clients = [];
 
// SSE GET endpoint
export async function GET(req) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
 
  // Add client
  clients.push(writer);
 
  // Remove client when disconnected
  req.signal.addEventListener("abort", () => {
    clients = clients.filter((c) => c !== writer);
  });
 
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
 
// Helper function to send order notifications to all clients
export function broadcastOrder(order) {
  clients.forEach(async (client) => {
    await client.write(
      new TextEncoder().encode(`data: ${JSON.stringify(order)}\n\n`)
    );
  });
}