const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log(`Server running at http://localhost:${port}`);

Bun.serve({
  port,
  fetch(_request) {
    return new Response("hello, world");
  },
});
