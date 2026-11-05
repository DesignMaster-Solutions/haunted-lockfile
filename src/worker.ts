// src/worker.ts — Cloudflare Worker entry point
import { handleHaunt } from "./haunt.js";
import { renderPage } from "./page.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // API
    if (url.pathname === "/api/haunt") {
      return handleHaunt(request);
    }

    // Serve the single-page app at root
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(renderPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
