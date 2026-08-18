// mock-jobs-server.mjs - a throwaway LOCAL-ONLY test server.
//
// It is not part of the real app, not referenced by any build/deploy step,
// and not committed alongside anything that runs in production. It exists
// purely so you can test the browser-side caching in src/lib/jobsCache.ts
// (localStorage, TTL expiry, pagination) without needing a real backend
// deployed anywhere - it just needs SOMETHING to answer GET /jobs the same
// shape the real api Lambda would.
//
// Run it with:
//   node scripts/mock-jobs-server.mjs
//
// It listens on http://localhost:8787 and only ever talks to your own
// browser on your own machine - nothing here reaches the internet, AWS, or
// any other real service.

import http from "node:http";
import { URL } from "node:url";

const PORT = 8787;

// A fixed list of fake jobs, generated once at startup, so paging through
// them behaves consistently across requests (same "database" every time,
// like the real S3 cache would be for the life of one scrape).
const SECTIONS = ["FAANG+", "Quant", "Other", "Software Engineering", "Product Management"];
const COMPANIES = ["Acme Corp", "Globex", "Initech", "Umbrella Co", "Stark Industries", "Wayne Enterprises", "Hooli", "Pied Piper"];

const ALL_JOBS = Array.from({ length: 45 }, (_, i) => ({
  id: `mock-${i}`,
  company: COMPANIES[i % COMPANIES.length],
  position: `Software Engineer Intern #${i}`,
  location: i % 3 === 0 ? "Remote" : "San Francisco, CA",
  salary: i % 4 === 0 ? "" : `$${40 + (i % 20)}/hr`,
  postingUrl: `https://example.com/jobs/${i}`,
  age: `${i}d`,
  closed: i % 11 === 0,
  sourceRepo: i % 2 === 0 ? "speedyapply/2027-SWE-College-Jobs" : "SimplifyJobs/New-Grad-Positions",
  sourceSection: SECTIONS[i % SECTIONS.length],
}));

const server = http.createServer((req, res) => {
  // Same CORS headers the real api Lambda sends (backend/internal/api/api.go's
  // reply()) - needed because Vite's dev server (localhost:5173) and this
  // mock server (localhost:8787) are different origins as far as the
  // browser is concerned.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/jobs") {
    const limit = Number(url.searchParams.get("limit") ?? "20") || 20;
    const offset = Number(url.searchParams.get("offset") ?? "0") || 0;

    const end = Math.min(offset + limit, ALL_JOBS.length);
    const page = offset < ALL_JOBS.length ? ALL_JOBS.slice(offset, end) : [];
    const nextOffset = end < ALL_JOBS.length ? end : null;

    console.log(`GET /jobs?limit=${limit}&offset=${offset} -> ${page.length} jobs, nextOffset=${nextOffset}`);

    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ jobs: page, scrapedAt: new Date().toISOString(), nextOffset }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`Mock jobs API running at http://localhost:${PORT}/jobs (local only - not AWS)`);
  console.log(`${ALL_JOBS.length} fake jobs loaded, ${ALL_JOBS.filter((j) => j.closed).length} marked closed.`);
});
