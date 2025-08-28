let clients = [];

export function GET(req) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      clients.push(send);

      req.signal.addEventListener("abort", () => {
        clients = clients.filter(c => c !== send);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}

// Function to push updates to all clients
export function pushUpdate(order) {
  clients.forEach((send) => send({ type: "new-order", order }));
}
