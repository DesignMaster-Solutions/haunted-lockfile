// src/worker.ts — Cloudflare Worker entry point
import { handleHaunt } from "./haunt.js";
import { renderPage } from "./page.js";
import { parseLockfile, keyToPackageName } from "./parseLockfile.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // API
    if (url.pathname === "/api/haunt") {
      return handleHaunt(request);
    }

    // Serve the parser functions as JavaScript for the browser
    if (url.pathname === "/parse.js" && request.method === "GET") {
      const code = `${keyToPackageName.toString()}\n${parseLockfile.toString()}`;
      return new Response(code, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
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
