// app/api/shopify/stream/route.js
let clients = [];

export async function GET(req) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      clients.push(send);

      // Remove client on disconnect
      req.signal.addEventListener("abort", () => {
        clients = clients.filter((client) => client !== send);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Helper to send updates to all connected clients
export function sendOrderUpdate(order) {
  clients.forEach((send) => {
    send({ type: "new-order", order });
  });
}
