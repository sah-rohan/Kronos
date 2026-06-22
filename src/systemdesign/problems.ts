// System Design practice. Each problem teaches the concepts, then asks the user
// to (1) place the right components, (2) connect them correctly, and (3) make the
// key design decisions by configuring each component. Wrong choices get a
// descriptive explanation.

// Open string so each new problem can introduce its own component types as data;
// the canvas maps known types to icons and falls back to a generic one.
export type SDComponentType = string;

export type SDConfigOption = { id: string; label: string };

export type SDConfig = {
  id: string;
  question: string;
  options: readonly SDConfigOption[];
  correct: string; // option id
  why: string; // explanation shown when the choice is wrong
};

export type SDComponentDef = {
  type: SDComponentType;
  name: string;
  blurb: string;
  explain: string;
  configs?: readonly SDConfig[];
};

// A "pick" presented as a quiz: choose an option, then see why it's the answer.
export type SDQuiz = {
  prompt: string;
  options: readonly SDConfigOption[];
  correct: string;
  why: string;
};
export type SDSlide = {
  title: string;
  body: string;
  bullets?: readonly string[];
  quiz?: SDQuiz;

  focus?: readonly SDComponentType[];
  // Concept illustration to show instead of the architecture diagram.
  art?: string;
  // Step-through-the-flow slide: the diagram advances one hop at a time.
  walk?: boolean;
};
export type SDConn = [SDComponentType, SDComponentType];

export type SDProblem = {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  summary: string;
  slides: SDSlide[];
  palette: SDComponentDef[];
  required: SDComponentType[];
  connections: SDConn[];
  // Response/return edges: the data flowing BACK after a request. Drawn dashed
  // and required in the build, just like forward connections. Each is the
  // response for some forward edge (usually its reverse).
  returns?: SDConn[];
  connectionWhy: Record<string, string>;
  missingWhy: Record<string, string>;
  layout: Record<SDComponentType, { x: number; y: number }>;
  // Short labels for what flows on each connection (keyed "from>to").
  edgeLabels?: Record<string, string>;
};

const COMPONENTS: Record<SDComponentType, SDComponentDef> = {
  client: {
    type: "client",
    name: "Client",
    blurb: "Browser or app",
    explain:
      "Whatever the user uses - a browser or mobile app. It sends two kinds of requests: 'shorten this URL' (a write) and 'open this short link' (a read). Reads massively outnumber writes.",
  },
  api_gateway: {
    type: "api_gateway",
    name: "API Gateway",
    blurb: "Entry point + routing",
    explain:
      "Once you have more than one operation you need a single entry point that routes requests: POST /shorten goes to the shortening service, GET /{code} goes to the redirection handler. It also handles auth, rate limiting, and TLS.",
  },
  shortening_service: {
    type: "shortening_service",
    name: "Shortening Service",
    blurb: "Handles writes (create)",
    explain:
      "The write path. It takes a long URL, gets a unique ID, encodes it into a short code, and stores the mapping. It's the only component that needs the ID generator.",
  },
  redirection_handler: {
    type: "redirection_handler",
    name: "Redirection Handler",
    blurb: "Handles reads (redirect)",
    explain:
      "The read path, and where almost all traffic goes. It looks up a short code and responds with a redirect to the original URL. Because reads dominate, this is the part you optimize hardest with caching.",
    configs: [
      {
        id: "redirect",
        question: "Which redirect status?",
        options: [
          { id: "301", label: "301 Permanent" },
          { id: "302", label: "302 Temporary" },
        ],
        correct: "302",
        why: "Use 302 (temporary). A 301 is cached by browsers, so repeat clicks skip your server entirely - you lose click analytics and can never change the destination. 302 keeps every click flowing through you.",
      },
    ],
  },
  id_generator: {
    type: "id_generator",
    name: "ID Generator",
    blurb: "Unique short codes",
    explain:
      "Every link needs a globally unique, short code. Generate a unique integer, then encode it into a compact string. The strategy and encoding are the two big decisions here.",
    configs: [
      {
        id: "strategy",
        question: "ID generation strategy?",
        options: [
          { id: "hash", label: "Hash (MD5 / SHA)" },
          { id: "uuid", label: "UUID v4" },
          { id: "snowflake", label: "Snowflake" },
          { id: "machine_seq", label: "Machine ID + sequence" },
        ],
        correct: "machine_seq",
        why: "Use Machine ID + sequence. Hashes collide and UUID/Snowflake IDs are long. A per-machine prefix plus an incrementing counter gives guaranteed-unique, short IDs and doubles as a shard key for scaling.",
      },
      {
        id: "encoding",
        question: "How to encode the ID?",
        options: [
          { id: "base16", label: "Base16 (hex)" },
          { id: "base64", label: "Base64" },
          { id: "base62", label: "Base62" },
        ],
        correct: "base62",
        why: "Use Base62 (A-Z, a-z, 0-9). Hex is too long; Base64 adds +, /, = which break URLs. Base62 is compact and URL-safe - 6 chars cover ~56B links.",
      },
    ],
  },
  cache: {
    type: "cache",
    name: "Cache",
    blurb: "Hot reads in memory",
    explain:
      "A read-heavy system needs a cache (Redis) in front of the database so popular links are served from memory in milliseconds and the DB isn't hammered.",
    configs: [
      {
        id: "pattern",
        question: "Caching pattern?",
        options: [
          { id: "write_through", label: "Write-through" },
          { id: "read_through", label: "Read-through" },
          { id: "none", label: "No cache" },
        ],
        correct: "read_through",
        why: "Use read-through: on a cache miss the cache loads from the DB and stores it, so the redirect handler stays simple and hot links self-populate. Write-through wastes memory on links that may never be read again.",
      },
    ],
  },
  database: {
    type: "database",
    name: "Database",
    blurb: "Durable code → URL store",
    explain:
      "Permanent storage for every code→URL mapping. Lookups are simple key reads, but it must scale to billions of rows and stay highly available.",
    configs: [
      {
        id: "type",
        question: "Which database?",
        options: [
          { id: "relational", label: "Relational (Postgres)" },
          { id: "wide_column", label: "Wide-column (Cassandra / DynamoDB)" },
          { id: "inmemory", label: "In-memory only (Redis)" },
        ],
        correct: "wide_column",
        why: "Use a wide-column / key-value store (Cassandra or DynamoDB). The access pattern is a simple key lookup at huge scale, and these partition and replicate horizontally. A single relational DB won't scale to billions of rows; in-memory alone isn't durable.",
      },
    ],
  },
  analytics_service: {
    type: "analytics_service",
    name: "Analytics Service",
    blurb: "Counts clicks",
    explain:
      "Tracks how often each link is opened, without slowing redirects. It records access events and increments per-link counters out of the redirect's critical path.",
    configs: [
      {
        id: "counter",
        question: "How to count clicks?",
        options: [
          { id: "db_each", label: "Write to DB on every click" },
          { id: "inmemory_flush", label: "In-memory counter, flush periodically" },
        ],
        correct: "inmemory_flush",
        why: "Keep counters in memory (Redis) and flush to the DB periodically. Writing to the DB on every single click can't keep up with redirect volume and would add latency to the read path.",
      },
    ],
  },
};

export const URL_SHORTENER: SDProblem = {
  slug: "design-url-shortener",
  title: "Design a URL Shortener",
  difficulty: "Medium",
  summary: "Shorten long URLs and redirect them at scale - and make every design decision.",
  slides: [
    {
      title: "What we're building",
      body: "A URL shortener takes a long URL and gives back a short, unique alias that redirects to the original. Examples: bit.ly, TinyURL, Twitter's t.co.",
      bullets: [
        "The alias is a short fixed-length string, e.g. usekronos.tech/aB3xZ9.",
        "It must store millions of links and keep them forever (persistent).",
        "Redirects must feel instant, even under heavy traffic.",
        "Optionally it tracks how often each link is clicked.",
      ],
    },
    {
      title: "Functional requirements (the verbs)",
      body: "Functional requirements are what the system must DO. Find them by pulling the verbs out of the prompt.",
      bullets: [
        "\"Generates a shorter alias\" → CREATE: take a long URL, return a short code.",
        "\"Redirects users to the original URL\" → READ: given a short code, send the user to the long URL.",
        "\"Track link usage\" → ANALYTICS: count how many times each code is opened.",
        "Everything else in the design exists to support these three operations.",
      ],
    },
    {
      title: "Non-functional requirements (the adjectives)",
      body: "Non-functional requirements are HOW WELL it must work - the quality bar. Find them by pulling the adjectives out of the prompt.",
      bullets: [
        "High availability: the service is up ~24/7. 'Availability' = the share of time requests succeed; we want very little downtime.",
        "Low latency: a redirect returns in a few milliseconds. 'Latency' = how long one request takes end to end.",
        "Durability: stored links survive crashes and restarts and are never lost.",
        "Uniqueness: every short code maps to exactly one URL - no collisions.",
      ],
    },
    {
      title: "Scale estimates",
      body: "Rough numbers tell us where to spend effort. 'Read:write ratio' = how many reads (redirects) happen per write (new link).",
      bullets: [
        "~100M daily users; read:write ratio ≈ 100:1 (far more clicks than new links).",
        "~1M new links/day; ~5 years retention → ~1.8 billion links total.",
        "Each row ~500 bytes → ~1 TB of mappings over 5 years.",
        "Takeaway: this is a READ-heavy system - caching and a horizontally scalable database matter most.",
      ],
    },
    {
      title: "Data model (the nouns)",
      body: "The data model is the tables/entities. Find them by pulling the nouns out of the prompt.",
      bullets: [
        "URLMapping: { short_code, original_url, created_at } - the core record that powers shorten + redirect.",
        "Analytics: { short_code, click_count } - tracks usage.",
        "They're one-to-one, and analytics is optional (a link can exist without tracking).",
        "Different services own each table so the write path and high-volume analytics writes scale independently.",
      ],
    },
    {
      title: "API endpoints",
      body: "Each functional requirement becomes one endpoint, following REST (the HTTP method signals the operation).",
      bullets: [
        "POST /api/urls/shorten - body has the long URL, returns the short URL (CREATE).",
        "GET /api/urls/{code} - returns a 302 redirect to the original URL (READ).",
        "Click tracking is NOT a public endpoint - it happens internally on each redirect.",
      ],
    },
    {
      title: "High level: the write path",
      body: "The write path handles 'shorten this URL'. Writes are rare (~1M/day) so it stays simple. The diagram shows just this flow.",
      focus: ["client", "api_gateway", "shortening_service", "id_generator", "database"],
      bullets: [
        "Client → API Gateway: the gateway is the single entry point that routes by request type.",
        "Gateway → Shortening Service: the service that runs the create logic.",
        "Shortening Service → ID Generator: get a unique integer, then encode it into a short code.",
        "Shortening Service → Database: store the code → URL mapping durably.",
      ],
    },
    {
      title: "High level: the read path",
      body: "The read path handles redirects - almost all traffic. A 'cache' is a small, fast, in-memory store (e.g. Redis) that holds hot data. The diagram shows just this flow.",
      focus: ["client", "api_gateway", "redirection_handler", "cache", "database"],
      bullets: [
        "Gateway → Redirection Handler: receives GET /{code} and returns a 302 to the original URL.",
        "Redirection Handler → Cache: check memory first; popular links are served in microseconds.",
        "Read-through cache: on a miss, the cache itself loads the value from the DB and stores it, so it self-populates.",
        "Because reads outnumber writes 100:1, the cache absorbs the load and shields the database.",
      ],
    },
    {
      title: "High level: analytics",
      body: "Analytics counts clicks without slowing redirects - it sits OFF the critical path (not in the chain that returns the redirect). The diagram shows just this flow.",
      focus: ["redirection_handler", "analytics_service", "database"],
      bullets: [
        "Each redirect reports the access to the Analytics Service asynchronously.",
        "It increments an in-memory counter per short code (very fast).",
        "Periodically it flushes those counts to the database for durable storage.",
        "Writing to the DB on every single click couldn't keep up with redirect volume.",
      ],
    },
    {
      title: "Deep dive: the ID needs two properties",
      body: "Every link needs a code with exactly two properties. We generate a unique integer first, then encode it into a short string.",
      bullets: [
        "Globally unique: no two different long URLs ever get the same code (no collisions).",
        "Short: production shorteners use ~5–8 characters (e.g. t.ly/ecgGp).",
        "Plan: pick how to generate the unique number (next slide), then how to encode it (slide after).",
      ],
    },
    {
      title: "Deep dive: generating the unique ID",
      body: "A 'hash function' turns any input into a fixed-size value. A 'collision' is when two different inputs produce the same output. Here are the options and why each does or doesn't work:",
      bullets: [
        "MD5: a hash that outputs 128 bits (32 hex characters). Fast, but collisions are possible and 32 chars is far too long.",
        "SHA-256: a stronger cryptographic hash, 256 bits (64 hex characters). Collision-resistant but even longer - impractical.",
        "UUID v4: a 122-bit random ID written as 36 characters (e.g. f47ac10b-58cc-...). Collisions are basically impossible, but 36 chars is way too long.",
        "Snowflake: a 64-bit ID = timestamp + machine ID + per-millisecond counter (used by Twitter). Unique and time-ordered, but still ~18 digits - too long.",
        "Machine ID + sequence: each server gets a unique prefix and increments its own counter per link. Guaranteed unique, you control the length, and the prefix doubles as a shard key.",
      ],
      quiz: {
        prompt: "Which ID generation strategy fits a URL shortener best?",
        options: [
          { id: "hash", label: "Hashing (MD5 / SHA)" },
          { id: "uuid", label: "UUID v4" },
          { id: "snowflake", label: "Snowflake" },
          { id: "machine_seq", label: "Machine ID + sequence" },
        ],
        correct: "machine_seq",
        why: "Machine ID + sequence is the only option that's both guaranteed-unique AND short with a length you control. Hashes can collide and are long, UUIDs are 36 chars, and Snowflake IDs are ~18 digits. Bonus: the machine prefix doubles as a shard key for scaling.",
      },
    },
    {
      title: "Deep dive: encoding the ID",
      body: "'Base N' means how many distinct characters you use to write a number - a higher base makes the string shorter. We encode the unique integer into a code:",
      bullets: [
        "Base16 (hex): digits 0–9 + a–f. Familiar, but a 64-bit number is ~16 chars - too long.",
        "Base64: A–Z, a–z, 0–9, plus + / = . Shorter, but + / = are special in URLs and break or need escaping.",
        "Base62: A–Z, a–z, 0–9 - 62 characters, no special symbols, fully URL-safe.",
        "Math: a 6-character Base62 code = 62^6 ≈ 56 billion combinations, far above the ~1.8B links we expect.",
      ],
      quiz: {
        prompt: "Which encoding gives short, URL-safe codes?",
        options: [
          { id: "base16", label: "Base16 (hex)" },
          { id: "base64", label: "Base64" },
          { id: "base62", label: "Base62" },
        ],
        correct: "base62",
        why: "Base62 uses A–Z, a–z, 0–9 - compact and fully URL-safe. Base16 (hex) is too long, and Base64's + / = characters are special in URLs and break or need escaping.",
      },
    },
    {
      title: "Deep dive: scaling with sharding",
      body: "'Sharding' = splitting data across multiple machines so the system scales horizontally (add machines instead of buying a bigger one). The 'shard key' decides which machine owns a piece of data.",
      bullets: [
        "Use the machine-ID prefix as the shard key: each generator machine writes only to its own DB shard.",
        "Write paths become fully independent - machines never coordinate, so they run in parallel.",
        "Scale by adding a machine with a new prefix; existing machines are untouched.",
        "On a read, the prefix inside the code tells you which shard to query.",
        "Read handlers scale separately (they're I/O-bound) from the ID generator (more CPU-bound).",
      ],
    },
    {
      title: "Deep dive: 301 vs 302 redirect",
      body: "An HTTP redirect tells the browser 'what you asked for lives at this other URL.' The status code controls whether the browser remembers it.",
      bullets: [
        "301 Permanent: the browser caches it and jumps straight to the destination next time, skipping your server.",
        "Downside of 301: you lose click analytics (repeat clicks never reach you) and can't change the destination later.",
        "302 Temporary: the browser asks your server every time.",
        "Benefit of 302: every click is tracked and you can change where a link points.",
      ],
      quiz: {
        prompt: "Which redirect should a URL shortener use?",
        options: [
          { id: "301", label: "301 Permanent" },
          { id: "302", label: "302 Temporary" },
        ],
        correct: "302",
        why: "Use 302. A 301 is cached by the browser, so repeat clicks skip your server - you lose click analytics and can't change the destination later. 302 routes every click through you, preserving tracking and flexibility.",
      },
    },
    {
      title: "Now build it",
      body: "That's the full primer - you now know every component and every decision. Next, each piece appears on the diagram, then you assemble it.",
      bullets: [
        "Drag each component onto the canvas.",
        "Connect them in the right direction (drag from a node's dot to another).",
        "Click each component to lock in its decision (ID strategy, encoding, DB, cache, redirect, analytics).",
        "Hit Check - get components, connections, and every decision right to pass.",
      ],
    },
  ],
  palette: [
    COMPONENTS.client,
    COMPONENTS.api_gateway,
    COMPONENTS.shortening_service,
    COMPONENTS.redirection_handler,
    COMPONENTS.id_generator,
    COMPONENTS.cache,
    COMPONENTS.database,
    COMPONENTS.analytics_service,
  ],
  required: [
    "client",
    "api_gateway",
    "shortening_service",
    "redirection_handler",
    "id_generator",
    "cache",
    "database",
    "analytics_service",
  ],
  connections: [
    ["client", "api_gateway"],
    ["api_gateway", "shortening_service"],
    ["api_gateway", "redirection_handler"],
    ["shortening_service", "id_generator"],
    ["shortening_service", "database"],
    ["redirection_handler", "cache"],
    ["cache", "database"],
    ["redirection_handler", "analytics_service"],
    ["analytics_service", "database"],
  ],
  // Response paths (dashed): the data that flows back after each request.
  // Analytics is fire-and-forget, so it has no return.
  returns: [
    ["api_gateway", "client"],
    ["shortening_service", "api_gateway"],
    ["redirection_handler", "api_gateway"],
    ["id_generator", "shortening_service"],
    ["database", "shortening_service"],
    ["cache", "redirection_handler"],
    ["database", "cache"],
  ],
  connectionWhy: {
    "client>api_gateway": "All traffic enters through the API gateway, which routes by request type.",
    "api_gateway>client": "The gateway returns the short URL (write) or the 302 redirect (read) to the client.",
    "shortening_service>api_gateway": "The new short URL is handed back to the gateway.",
    "redirection_handler>api_gateway": "The resolved long URL / redirect is handed back to the gateway.",
    "id_generator>shortening_service": "The unique code is returned to the shortening service.",
    "database>shortening_service": "The database acknowledges the write.",
    "cache>redirection_handler": "The cached long URL is returned for the redirect.",
    "database>cache": "On a miss, the database returns the mapping to populate the cache.",
    "api_gateway>shortening_service": "POST /shorten requests are routed to the write service.",
    "api_gateway>redirection_handler": "GET /{code} requests are routed to the read/redirect handler.",
    "shortening_service>id_generator": "Creating a link needs a unique short code from the ID generator.",
    "shortening_service>database": "The new code→URL mapping is written to the database.",
    "redirection_handler>cache": "Redirects check the cache first so hot links are served from memory.",
    "cache>database": "On a cache miss, the read-through cache loads the mapping from the database.",
    "redirection_handler>analytics_service": "Each access is reported to analytics, off the redirect's critical path.",
    "analytics_service>database": "Analytics periodically flushes click counts to the database for durability.",
  },
  missingWhy: {
    client: "Every design starts with the client that sends requests.",
    api_gateway:
      "With two operations (shorten and redirect) you need a gateway to route requests and handle auth, rate limiting, and TLS in one place.",
    shortening_service: "Without a write service there's nothing to create and store short codes.",
    redirection_handler: "Without a read handler there's nothing to serve the redirects - which is most of your traffic.",
    id_generator: "Without a unique ID source, two URLs could collide on the same short code.",
    cache: "Without a cache, every read hits the DB. In a 100:1 read system that's a latency and overload problem.",
    database: "Without durable storage, mappings vanish on restart and links break.",
    analytics_service: "Without an analytics service you can't track click usage, one of the requirements.",
  },
  // Top-to-bottom flow: client in, database at the bottom. Cache and Analytics
  // sit side by side so the read path never has an edge crossing over a box.
  layout: {
    client: { x: 225, y: 20 },
    api_gateway: { x: 225, y: 130 },
    shortening_service: { x: 40, y: 250 },
    redirection_handler: { x: 360, y: 250 },
    id_generator: { x: 40, y: 380 },
    cache: { x: 285, y: 380 },
    analytics_service: { x: 450, y: 380 },
    database: { x: 225, y: 545 },
  },
  edgeLabels: {
    "client>api_gateway": "requests",
    "api_gateway>shortening_service": "POST",
    "api_gateway>redirection_handler": "GET",
    "shortening_service>id_generator": "get code",
    "shortening_service>database": "write",
    "redirection_handler>cache": "read",
    "cache>database": "miss",
    "redirection_handler>analytics_service": "track",
    "analytics_service>database": "flush",
    "api_gateway>client": "short URL",
    "id_generator>shortening_service": "code",
    "cache>redirection_handler": "long URL",
    "database>cache": "row",
  },
};

const RL = {
  client: {
    type: "client",
    name: "Client",
    blurb: "Sends requests",
    explain:
      "Browsers, apps, or other services making requests. Some clients send far more than their fair share - by accident (a buggy loop) or on purpose (abuse / DDoS).",
  },
  rate_limiter: {
    type: "rate_limiter",
    name: "Rate Limiter",
    blurb: "Allows or blocks requests",
    explain:
      "Middleware that counts each client's recent requests and decides allow vs block. It lives in front of your servers (in the gateway / a middleware layer) so abusive traffic is stopped before it reaches business logic. The two decisions: which algorithm, and what to return when blocked.",
    configs: [
      {
        id: "algorithm",
        question: "Which limiting algorithm?",
        options: [
          { id: "fixed_window", label: "Fixed window counter" },
          { id: "sliding_log", label: "Sliding window log" },
          { id: "token_bucket", label: "Token bucket" },
        ],
        correct: "token_bucket",
        why: "Use the token bucket: tokens refill at a steady rate and each request spends one - it's memory-light and allows short bursts. A fixed window lets a client spike at the window boundary (2× the limit), and a sliding log is accurate but stores a timestamp per request (memory-heavy).",
      },
      {
        id: "response",
        question: "What to return when limited?",
        options: [
          { id: "drop", label: "Silently drop" },
          { id: "http_429", label: "HTTP 429 + Retry-After" },
          { id: "queue", label: "Queue for later" },
        ],
        correct: "http_429",
        why: "Return HTTP 429 (Too Many Requests) with a Retry-After header so well-behaved clients know to back off and when to retry. Silently dropping leaves clients guessing; queueing delays responses and hides the limit.",
      },
    ],
  },
  rules: {
    type: "rules",
    name: "Rules Store",
    blurb: "Holds the limits",
    explain:
      "Where the limits live (e.g. '100 requests/min per user for the login endpoint'). Keeping rules in a store the limiter loads (and caches) means you can change limits without redeploying.",
  },
  redis: {
    type: "redis",
    name: "Redis Counter",
    blurb: "Shared, fast counters",
    explain:
      "An in-memory store (Redis) holding each client's request count. It's shared so every limiter instance sees the same totals, supports atomic increments (no race conditions), and has TTLs so counts expire automatically at the window's end.",
  },
  api_servers: {
    type: "api_servers",
    name: "API Servers",
    blurb: "Your backend",
    explain:
      "The real application servers. They only receive requests the limiter allowed through, so they're shielded from floods.",
  },
} as const;

export const RATE_LIMITER: SDProblem = {
  slug: "design-rate-limiter",
  title: "Design a Rate Limiter",
  difficulty: "Medium",
  summary: "Cap how many requests a client can make in a time window - and make the key decisions.",
  slides: [
    {
      title: "What we're building",
      body: "A rate limiter caps how many requests a client can make in a window (e.g. 100/min). It protects your system and enforces fair use.",
      bullets: [
        "Blocks excess requests before they reach your servers.",
        "Defends against abuse, scrapers, and accidental floods.",
        "Keeps cost down and one noisy client from hurting everyone else.",
      ],
    },
    {
      title: "Requirements",
      body: "What it must do and how well it must do it.",
      bullets: [
        "Functional: accurately limit requests per client (by user ID, API key, or IP).",
        "Low latency: it sits on every request, so it must add almost no delay.",
        "Highly available: if the limiter is down, it must not take the whole API down.",
        "Distributed: it has to work across many server instances, not just one.",
      ],
    },
    {
      title: "Where should it live?",
      body: "A rate limiter can run in three places. Each has trade-offs - make the call:",
      bullets: [
        "Client-side: the client counts its own requests. Easy, but anyone can edit or fake a client.",
        "Server-side middleware: runs on your servers before business logic - you fully control it.",
        "API gateway: a managed layer all traffic already passes through, a natural home for the middleware.",
      ],
      quiz: {
        prompt: "Where should you put the rate limiter?",
        options: [
          { id: "client", label: "On the client" },
          { id: "server", label: "Server-side middleware / gateway" },
          { id: "db", label: "Inside the database" },
        ],
        correct: "server",
        why: "Put it server-side (middleware, often in the API gateway). The client can be modified or spoofed, so it can never be trusted to limit itself; the database is too deep - you want to reject excess traffic before it reaches business logic at all.",
      },
    },
    {
      title: "Algorithm: fixed window counter",
      body: "Count requests in fixed clock windows (e.g. each minute). Simple, but has a flaw.",
      bullets: [
        "Keep one counter per client per window; increment on each request; reset when the window rolls over.",
        "Flaw: a client can send the full limit at the end of one window and again at the start of the next - up to 2× the limit in a short span (the 'boundary burst').",
      ],
    },
    {
      title: "Algorithm: sliding window log",
      body: "Store the timestamp of every request and count how many fall in the last window. Accurate, but heavy.",
      bullets: [
        "On each request, drop timestamps older than the window, then count what's left.",
        "Very accurate - no boundary burst.",
        "Downside: stores one timestamp per request, so memory grows with traffic.",
      ],
    },
    {
      title: "Algorithm: token bucket",
      body: "A bucket holds tokens; each request spends one; tokens refill at a fixed rate. Memory-light and burst-friendly.",
      art: "token_bucket",
      bullets: [
        "Bucket has a capacity (max burst) and a refill rate (steady allowance).",
        "Request with a token → allowed; empty bucket → blocked.",
        "Only two numbers per client (tokens + last-refill time) - tiny memory.",
        "Allows short bursts up to the capacity while enforcing the long-run rate. Widely used (Stripe, AWS).",
      ],
    },
    {
      title: "Pick the algorithm",
      body: "You've seen all three. Given low memory, simplicity, and allowing reasonable bursts - which would you choose?",
      quiz: {
        prompt: "Which algorithm is the best default for a general API rate limiter?",
        options: [
          { id: "fixed_window", label: "Fixed window counter" },
          { id: "sliding_log", label: "Sliding window log" },
          { id: "token_bucket", label: "Token bucket" },
        ],
        correct: "token_bucket",
        why: "Token bucket: it stores only two numbers per client (memory-light), allows short bursts up to the bucket capacity, and enforces the steady long-run rate. Fixed window allows a 2× boundary burst; sliding log is accurate but stores a timestamp per request, so memory grows with traffic.",
      },
    },
    {
      title: "Going distributed",
      body: "With many limiter instances, per-server in-memory counts don't work - each server only sees part of the traffic.",
      bullets: [
        "Use a shared, central store (Redis) so all instances share one count per client.",
        "Race condition: two requests reading-then-writing the same counter can both 'win'. Use Redis atomic operations (INCR / Lua scripts) so increments are safe.",
        "Set a TTL on each counter so it expires automatically at the window's end - no cleanup job.",
      ],
    },
    {
      title: "What to return when blocked",
      body: "When a request is over the limit, how should the server respond?",
      quiz: {
        prompt: "What's the best response for a blocked request?",
        options: [
          { id: "drop", label: "Silently drop it" },
          { id: "http_429", label: "HTTP 429 + Retry-After" },
          { id: "queue", label: "Queue it for later" },
        ],
        correct: "http_429",
        why: "Return HTTP 429 (Too Many Requests) with a Retry-After header, so well-behaved clients know they were limited and exactly when to retry. Silently dropping leaves clients guessing and retrying blindly; queueing hides the limit and delays responses, which can pile up under load.",
      },
    },
    {
      title: "Now build it",
      body: "You know the pieces and the decisions. Assemble the design.",
      bullets: [
        "Place each component and connect them in the right direction.",
        "Configure the Rate Limiter: pick the algorithm and the blocked-response.",
        "Check - components, connections, and decisions must all be right to pass.",
      ],
    },
  ],
  palette: [RL.client, RL.rate_limiter, RL.rules, RL.redis, RL.api_servers],
  required: ["client", "rate_limiter", "rules", "redis", "api_servers"],
  connections: [
    ["client", "rate_limiter"],
    ["rate_limiter", "rules"],
    ["rate_limiter", "redis"],
    ["rate_limiter", "api_servers"],
  ],
  returns: [
    ["rules", "rate_limiter"],
    ["redis", "rate_limiter"],
    ["api_servers", "rate_limiter"],
    ["rate_limiter", "client"],
  ],
  connectionWhy: {
    "client>rate_limiter": "All client traffic hits the limiter first, before any business logic.",
    "rules>rate_limiter": "The rules store returns the limit config to the limiter.",
    "redis>rate_limiter": "Redis returns the updated counter so the limiter can allow or reject.",
    "api_servers>rate_limiter": "The API servers return their response to the limiter.",
    "rate_limiter>client": "The limiter returns the response (or a 429 'too many requests') to the client.",
    "rate_limiter>rules": "The limiter loads the limit rules (e.g. 100/min per user) from the rules store.",
    "rate_limiter>redis": "The limiter reads and atomically increments each client's counter in shared Redis.",
    "rate_limiter>api_servers": "Only allowed requests are forwarded to the API servers.",
  },
  missingWhy: {
    client: "Every design starts with the client sending requests.",
    rate_limiter: "Without the limiter there's nothing counting requests or blocking abuse.",
    rules: "Without a rules store the limiter has no limits to enforce, and you couldn't change them without a redeploy.",
    redis: "Without a shared counter store, each instance only sees its own traffic and the limit is wrong across servers.",
    api_servers: "Without backend servers there's nothing for allowed requests to reach.",
  },
  layout: {
    client: { x: 205, y: 20 },
    rate_limiter: { x: 205, y: 140 },
    rules: { x: 40, y: 270 },
    redis: { x: 370, y: 270 },
    api_servers: { x: 205, y: 400 },
  },
  edgeLabels: {
    "client>rate_limiter": "request",
    "rate_limiter>rules": "load rules",
    "rate_limiter>redis": "count",
    "rate_limiter>api_servers": "allowed",
  },
};

const UID = {
  app_servers: {
    type: "app_servers",
    name: "App Servers",
    blurb: "Need unique IDs",
    explain:
      "Your services that create records (orders, posts, messages). Each new record needs a unique ID, and there are many app servers running at once - so IDs must stay unique across all of them without coordinating on every request.",
  },
  id_generator: {
    type: "id_generator",
    name: "ID Generator",
    blurb: "Produces 64-bit IDs",
    explain:
      "The service (or library) that hands out unique 64-bit IDs. The big decision is the scheme: it must be unique across machines, fit in 64 bits, and ideally be sortable by time - without a central bottleneck on every call.",
    configs: [
      {
        id: "approach",
        question: "ID generation approach?",
        options: [
          { id: "multi_master", label: "Multi-master DB auto-increment" },
          { id: "uuid", label: "UUID (128-bit)" },
          { id: "ticket", label: "Central ticket server" },
          { id: "snowflake", label: "Snowflake (time + machine + seq)" },
        ],
        correct: "snowflake",
        why: "Snowflake: a 64-bit ID = timestamp + machine ID + per-ms sequence. It's unique across machines with no per-request coordination, fits 64 bits, and is time-sortable. Multi-master is hard to scale and not cleanly ordered; UUIDs are 128-bit and not time-sortable; a central ticket server is a single point of failure and bottleneck.",
      },
    ],
  },
  coordinator: {
    type: "coordinator",
    name: "Coordinator (ZooKeeper)",
    blurb: "Assigns machine IDs",
    explain:
      "A coordination service (e.g. ZooKeeper) that gives each ID-generator node a unique machine ID when it starts up. That uniqueness is what guarantees two nodes never produce the same ID. It's only used at startup, not on every request.",
  },
} as const;

export const UNIQUE_ID: SDProblem = {
  slug: "design-unique-id-generator",
  title: "Design a Unique ID Generator",
  difficulty: "Medium",
  summary: "Generate unique, time-sortable 64-bit IDs across many machines - pick the scheme.",
  slides: [
    {
      title: "What we're building",
      body: "A way to generate IDs that are unique across a distributed system - every new record (order, post, message) needs one, and many servers create records at once.",
      bullets: [
        "Why not a database auto-increment? It doesn't work across many independent databases/servers.",
        "IDs must be unique everywhere, with no two machines ever colliding.",
        "We also want them roughly sortable by time, and small.",
      ],
    },
    {
      title: "Requirements",
      body: "The properties a good ID scheme must hit.",
      bullets: [
        "Unique: no collisions across all machines.",
        "64-bit: fits a standard integer column and is compact.",
        "Time-sortable: IDs created later sort after earlier ones (great for feeds and pagination).",
        "High throughput, low latency: generated locally without a network round-trip per ID.",
      ],
    },
    {
      title: "Approach: multi-master DB",
      body: "Use several databases with auto-increment, each stepping by N to avoid overlap.",
      bullets: [
        "E.g. with 2 DBs, one yields 1, 3, 5… the other 2, 4, 6…",
        "Drawbacks: hard to add/remove servers (the step changes), IDs aren't time-ordered across DBs, and it doesn't scale cleanly.",
      ],
    },
    {
      title: "Approach: UUID",
      body: "A 128-bit value generated independently on each machine - no coordination at all.",
      bullets: [
        "Pro: each server makes its own with effectively zero collision chance.",
        "Cons: it's 128 bits (not 64) and not sortable by time, which hurts feeds and indexing.",
      ],
    },
    {
      title: "Approach: ticket server",
      body: "One central server hands out the next number to everyone.",
      bullets: [
        "Pro: simple, gives clean numeric, increasing IDs.",
        "Con: it's a single point of failure and a bottleneck - every ID needs a network call to that one server.",
      ],
    },
    {
      title: "Approach: Snowflake",
      body: "Build a 64-bit ID from parts, generated locally on each machine. This is the standard distributed approach.",
      art: "snowflake",
      bullets: [
        "Layout (64 bits): 1 sign bit + 41-bit timestamp + ~10 bits machine ID + 12-bit per-millisecond sequence.",
        "Timestamp first → IDs sort by time. Machine ID → no cross-machine collisions. Sequence → many IDs within the same millisecond.",
        "No per-request coordination: each machine generates IDs by itself, so it's fast and scales.",
      ],
    },
    {
      title: "Pick the approach",
      body: "Given unique + 64-bit + time-sortable + no central bottleneck - which fits best?",
      quiz: {
        prompt: "Which ID scheme should you choose?",
        options: [
          { id: "multi_master", label: "Multi-master DB auto-increment" },
          { id: "uuid", label: "UUID" },
          { id: "ticket", label: "Central ticket server" },
          { id: "snowflake", label: "Snowflake" },
        ],
        correct: "snowflake",
        why: "Snowflake hits all four: unique (machine ID), 64-bit, time-sortable (timestamp leads), and generated locally so there's no central bottleneck. UUID is 128-bit and unsortable; the ticket server is a single point of failure; multi-master doesn't order or scale cleanly.",
      },
    },
    {
      title: "Detail: machine IDs and clocks",
      body: "Two things make Snowflake reliable in practice.",
      bullets: [
        "Machine IDs: a coordination service (ZooKeeper) assigns each node a unique machine ID at startup - this is what prevents collisions.",
        "Sequence overflow: if a machine generates more than 4096 IDs in one millisecond, it waits for the next millisecond.",
        "Clock skew: machines rely on the clock moving forward; NTP keeps clocks in sync so timestamps stay monotonic.",
      ],
    },
    {
      title: "Now build it",
      body: "Assemble the generator.",
      bullets: [
        "Place the components and connect them in the right direction.",
        "Configure the ID Generator's approach.",
        "Check - components, connections, and the decision must all be right.",
      ],
    },
  ],
  palette: [UID.app_servers, UID.id_generator, UID.coordinator],
  required: ["app_servers", "id_generator", "coordinator"],
  connections: [
    ["app_servers", "id_generator"],
    ["id_generator", "coordinator"],
  ],
  connectionWhy: {
    "app_servers>id_generator": "App servers ask the generator for a new unique ID when creating a record.",
    "id_generator>coordinator": "At startup, each generator node gets a unique machine ID from the coordinator.",
  },
  missingWhy: {
    app_servers: "Without app servers there's nothing requesting IDs.",
    id_generator: "Without the generator there's nothing producing unique IDs.",
    coordinator: "Without a coordinator assigning unique machine IDs, two nodes could pick the same one and generate colliding IDs.",
  },
  layout: {
    app_servers: { x: 205, y: 30 },
    id_generator: { x: 205, y: 170 },
    coordinator: { x: 205, y: 310 },
  },
  edgeLabels: {
    "app_servers>id_generator": "get ID",
    "id_generator>coordinator": "machine ID",
  },
};

const NOTIF = {
  services: {
    type: "services",
    name: "Trigger Services",
    blurb: "Cause notifications",
    explain:
      "The services that decide a notification should be sent - an order shipped, someone liked your post, a payment failed. They hand the event to the notification system rather than calling email/SMS providers themselves.",
  },
  notification_service: {
    type: "notification_service",
    name: "Notification Service",
    blurb: "Builds & routes",
    explain:
      "The core service. It validates the request, looks up the recipient's device tokens / contact info and settings, applies templates, and routes each notification to the right channel. The key reliability decision is how it avoids sending the same notification twice.",
    configs: [
      {
        id: "dedupe",
        question: "How to avoid duplicate sends?",
        options: [
          { id: "none", label: "No dedupe" },
          { id: "dedupe_id", label: "Dedupe by notification ID" },
        ],
        correct: "dedupe_id",
        why: "Give each event a unique notification ID and ignore one you've already processed. Distributed systems retry on failure, so the same event can arrive twice - without a dedupe key, users get duplicate notifications.",
      },
    ],
  },
  database: {
    type: "database",
    name: "Database",
    blurb: "Tokens & settings",
    explain:
      "Stores each user's device tokens (for push), contact info (email/phone), opt-in/opt-out settings, and templates. The notification service reads it to know where and whether to send.",
  },
  queue: {
    type: "queue",
    name: "Message Queues",
    blurb: "Buffer per channel",
    explain:
      "A queue (often one per channel: iOS, Android, SMS, email) between the notification service and the workers. It decouples the two so a slow or down provider never blocks the service, and it absorbs spikes.",
  },
  workers: {
    type: "workers",
    name: "Workers",
    blurb: "Pull & send",
    explain:
      "Workers pull notifications off the queues and call the third-party provider APIs. You scale them independently per channel. The key decision is what they do when a send fails.",
    configs: [
      {
        id: "retry",
        question: "On a failed send?",
        options: [
          { id: "drop", label: "Drop the notification" },
          { id: "retry", label: "Retry with backoff, then dead-letter" },
        ],
        correct: "retry",
        why: "Retry with exponential backoff, and move repeatedly-failing messages to a dead-letter queue for inspection. Providers have transient failures; dropping silently loses notifications, which violates the no-loss requirement.",
      },
    ],
  },
  providers: {
    type: "providers",
    name: "Provider APIs",
    blurb: "APNs / FCM / SMS / email",
    explain:
      "The third-party services that actually deliver: APNs (iOS push), FCM (Android push), an SMS provider (Twilio), and an email provider (SendGrid). Each device/channel has its own API and token format.",
  },
} as const;

export const NOTIFICATION: SDProblem = {
  slug: "design-notification-system",
  title: "Design a Notification System",
  difficulty: "Medium",
  summary: "Deliver push, SMS, and email reliably at scale - and make the routing/reliability calls.",
  slides: [
    {
      title: "What we're building",
      body: "A system that sends notifications across channels: iOS push, Android push, SMS, and email.",
      bullets: [
        "Many services trigger notifications; they shouldn't each integrate every provider.",
        "Each channel has its own provider and token format (APNs, FCM, Twilio, SendGrid).",
        "It must be reliable (no lost notifications), scalable, and respect user opt-out.",
      ],
    },
    {
      title: "Channels & contact info",
      body: "To send anything, you first need where to send it.",
      bullets: [
        "Push needs a device token, collected when the app registers and stored per user/device.",
        "SMS needs a phone number; email needs an address.",
        "All of this lives in a database the system reads before sending.",
      ],
    },
    {
      title: "Requirements",
      body: "What good looks like.",
      bullets: [
        "Multi-channel: push (iOS/Android), SMS, email from one system.",
        "Soft real-time: deliver within seconds, but a small delay is acceptable.",
        "Reliable: never silently lose a notification.",
        "Scalable: handle bursts (a marketing blast) without falling over.",
        "Respect settings: honor opt-out and don't spam.",
      ],
    },
    {
      title: "High level",
      body: "Trigger services hand events to one notification service, which looks up contact info and routes by channel.",
      bullets: [
        "Services publish an event ('notify user 12: order shipped') instead of calling providers.",
        "The notification service reads tokens/settings from the database.",
        "It then needs to actually deliver via the third-party provider APIs - but not by calling them directly. Why? Next slide.",
      ],
    },
    {
      title: "Decoupling the send",
      body: "If the notification service called provider APIs directly and a provider was slow or down, the whole service would back up.",
      focus: ["notification_service", "queue", "workers", "providers"],
      quiz: {
        prompt: "How should the service hand work to the senders?",
        options: [
          { id: "direct", label: "Call provider APIs directly" },
          { id: "queue", label: "Put messages on a queue for workers" },
          { id: "cron", label: "Batch once an hour with a cron job" },
        ],
        correct: "queue",
        why: "Use message queues with workers. The queue decouples the service from the providers, so a slow/failed provider never blocks the service, and it buffers spikes. Calling directly couples their fates; an hourly cron breaks the soft-real-time requirement.",
      },
    },
    {
      title: "Workers and failures",
      body: "Workers pull from the queues and call the providers. Provider calls fail sometimes (rate limits, outages).",
      focus: ["queue", "workers", "providers"],
      quiz: {
        prompt: "What should a worker do when a provider send fails?",
        options: [
          { id: "drop", label: "Drop it" },
          { id: "retry", label: "Retry with backoff, then dead-letter" },
          { id: "crash", label: "Stop the worker" },
        ],
        correct: "retry",
        why: "Retry with exponential backoff and send repeatedly-failing messages to a dead-letter queue for inspection. Dropping loses notifications (violates no-loss); stopping the worker halts all delivery for everyone.",
      },
    },
    {
      title: "Avoiding duplicates",
      body: "Because the system retries, the same event can be processed more than once.",
      quiz: {
        prompt: "How do you stop users getting the same notification twice?",
        options: [
          { id: "none", label: "Nothing - retries are rare" },
          { id: "dedupe_id", label: "Dedupe by a unique notification ID" },
          { id: "sleep", label: "Add a delay before sending" },
        ],
        correct: "dedupe_id",
        why: "Attach a unique notification ID to each event and skip any ID you've already handled. Retries and at-least-once queues mean duplicates will happen; a dedupe key is the only reliable guard.",
      },
    },
    {
      title: "Other essentials",
      body: "Things a complete design includes.",
      bullets: [
        "Settings/opt-out: check user preferences before sending; never message opted-out users.",
        "Templates: reusable message formats so services send data, not formatted strings.",
        "Rate limiting: cap how many notifications a user receives so you don't spam them.",
        "Analytics: track sent / delivered / opened to measure effectiveness.",
      ],
    },
    {
      title: "Now build it",
      body: "Assemble the pipeline.",
      bullets: [
        "Place the components and connect them in the direction events flow.",
        "Configure the Notification Service (dedupe) and the Workers (retry).",
        "Check - components, connections, and decisions must all be right.",
      ],
    },
  ],
  palette: [NOTIF.services, NOTIF.notification_service, NOTIF.database, NOTIF.queue, NOTIF.workers, NOTIF.providers],
  required: ["services", "notification_service", "database", "queue", "workers", "providers"],
  connections: [
    ["services", "notification_service"],
    ["notification_service", "database"],
    ["notification_service", "queue"],
    ["queue", "workers"],
    ["workers", "providers"],
  ],
  connectionWhy: {
    "services>notification_service": "Trigger services publish events to the notification service instead of calling providers themselves.",
    "notification_service>database": "It reads device tokens, contact info, and opt-out settings before sending.",
    "notification_service>queue": "It enqueues each notification so workers can deliver it asynchronously.",
    "queue>workers": "Workers pull notifications off the queues at their own pace.",
    "workers>providers": "Workers call the third-party provider APIs (APNs/FCM/SMS/email) to deliver.",
  },
  missingWhy: {
    services: "Without trigger services, nothing creates notification events.",
    notification_service: "Without the core service there's nothing to validate, look up, and route notifications.",
    database: "Without the database the service doesn't know users' device tokens, contacts, or opt-out settings.",
    queue: "Without queues, a slow provider blocks the service and spikes have nowhere to buffer.",
    workers: "Without workers there's nothing pulling from the queues to actually send.",
    providers: "Without the provider APIs notifications can't be delivered to devices.",
  },
  layout: {
    services: { x: 205, y: 20 },
    notification_service: { x: 205, y: 140 },
    database: { x: 30, y: 270 },
    queue: { x: 380, y: 270 },
    workers: { x: 380, y: 390 },
    providers: { x: 380, y: 510 },
  },
  edgeLabels: {
    "services>notification_service": "events",
    "notification_service>database": "tokens",
    "notification_service>queue": "enqueue",
    "queue>workers": "dequeue",
    "workers>providers": "send",
  },
};

// ---------- Consistent Hashing ----------
const CH = {
  client: { type: "client", name: "Clients", blurb: "Look up keys", explain: "Clients (or app servers) need to find which node stores a given key. The goal is to spread keys evenly and move as few keys as possible when nodes are added or removed." },
  router: {
    type: "router", name: "Hash Router", blurb: "Maps key → node",
    explain: "Decides which node owns each key. The naive way is hash(key) % N, but that remaps almost everything when N changes. Consistent hashing places nodes and keys on a ring so adding/removing a node only moves the keys near it.",
    configs: [
      { id: "strategy", question: "How to map keys to nodes?", options: [{ id: "modn", label: "hash(key) % N" }, { id: "consistent", label: "Consistent hashing (ring)" }], correct: "consistent", why: "Consistent hashing: with hash(key) % N, changing N (adding/removing a server) reshuffles ~all keys, causing a storm of cache misses or data movement. On a hash ring, only the keys between the changed node and its neighbor move - about 1/N of the data." },
      { id: "vnodes", question: "Even load across nodes?", options: [{ id: "single", label: "One point per node" }, { id: "virtual", label: "Virtual nodes (many points per node)" }], correct: "virtual", why: "Use virtual nodes: placing each physical node at many points on the ring evens out the key distribution and avoids one node owning a huge arc. With a single point per node, gaps are uneven and load is lopsided." },
    ],
  },
  nodes: { type: "cache_nodes", name: "Cache/Storage Nodes", blurb: "Own ranges of the ring", explain: "The servers that actually hold the data. Each owns the keys in its arc of the ring; when one is added or removed, only its neighbor's keys shift." },
} as const;
const CONSISTENT_HASHING: SDProblem = {
  slug: "design-consistent-hashing", title: "Design Consistent Hashing", difficulty: "Medium",
  summary: "Distribute keys across a changing set of servers while moving as little data as possible.",
  slides: [
    { title: "The problem", body: "You have data spread across N servers and need to find which server holds each key.", bullets: ["The simple answer hash(key) % N works… until N changes.", "Add or remove one server and % N remaps almost every key.", "That means massive cache misses or data migration every time the cluster scales."] },
    { title: "Why % N hurts", body: "The modulus depends on N, so the whole mapping shifts when N changes.", bullets: ["With 4 servers, key→server is hash % 4; with 5 it's hash % 5 - different for nearly every key.", "Goal: when a server joins/leaves, only ~1/N of keys should move."] },
    { title: "The hash ring", body: "Consistent hashing maps both servers and keys onto a circle (e.g. 0…2^32).", art: "hash_ring", bullets: ["A key is owned by the first server clockwise from it.", "Add a server → only keys between it and the previous server move.", "Remove a server → its keys go to the next server clockwise. Everyone else is untouched."] },
    { title: "Pick the scheme", body: "Given a cluster that scales up and down, which mapping?", quiz: { prompt: "How should keys map to servers?", options: [{ id: "modn", label: "hash(key) % N" }, { id: "consistent", label: "Consistent hashing" }], correct: "consistent", why: "Consistent hashing moves only ~1/N of keys when the cluster changes; % N reshuffles almost everything, which is catastrophic for caches and storage." } },
    { title: "Virtual nodes", body: "A plain ring can distribute load unevenly - a server might own a huge arc by chance.", quiz: { prompt: "How do you keep load even across servers?", options: [{ id: "single", label: "One ring point per server" }, { id: "virtual", label: "Virtual nodes" }], correct: "virtual", why: "Virtual nodes put each server at many points on the ring, so arcs average out and load is balanced. They also make heterogeneous servers easy - give bigger servers more virtual nodes." } },
    { title: "Now build it", body: "Assemble the routing.", bullets: ["Client → Hash Router → Cache/Storage Nodes.", "Configure the router: strategy and virtual nodes.", "Check everything."] },
  ],
  palette: [CH.client, CH.router, CH.nodes],
  required: ["client", "router", "cache_nodes"],
  connections: [["client", "router"], ["router", "cache_nodes"]],
  returns: [["cache_nodes", "router"], ["router", "client"]],
  connectionWhy: { "client>router": "Clients ask the router which node owns a key.", "router>cache_nodes": "The router forwards the request to the node that owns that part of the ring." },
  missingWhy: { client: "Something has to look up keys.", router: "Without the router there's nothing computing key→node placement.", cache_nodes: "Without nodes there's nowhere to store the data." },
  layout: { client: { x: 205, y: 30 }, router: { x: 205, y: 170 }, cache_nodes: { x: 205, y: 310 } },
  edgeLabels: { "client>router": "key", "router>cache_nodes": "route" },
};

// ---------- Key-Value Store ----------
const KV = {
  client: { type: "client", name: "Clients", blurb: "get / put keys", explain: "Clients read and write values by key. At scale this store spans many nodes and must stay available even when some nodes or networks fail." },
  coordinator: {
    type: "coordinator", name: "Coordinator", blurb: "Routes + replicates",
    explain: "Any node can act as coordinator: it uses consistent hashing to find which nodes own a key, writes/reads copies across them, and resolves conflicts. The big decisions are how many copies, and the consistency model.",
    configs: [
      { id: "consistency", question: "Consistency model?", options: [{ id: "strong", label: "Strong (block until all replicas agree)" }, { id: "quorum", label: "Quorum (W + R > N)" }, { id: "none", label: "Write one node only" }], correct: "quorum", why: "Use quorum: require W write-acks and R read-replies with W + R > N, which guarantees a read sees the latest write while staying available. Strong consistency on every replica kills availability/latency; writing one node risks data loss and stale reads." },
      { id: "conflict", question: "Resolve concurrent writes?", options: [{ id: "lww", label: "Last-write-wins by clock" }, { id: "vector", label: "Versioning (vector clocks)" }], correct: "vector", why: "Use versioning (vector clocks) so concurrent updates are detected and can be reconciled instead of silently lost. Last-write-wins by wall-clock drops one update and is wrong under clock skew." },
    ],
  },
  nodes: { type: "storage_nodes", name: "Storage Nodes", blurb: "Replicated data", explain: "Nodes arranged on a consistent-hash ring. Each key is replicated to the next N nodes for durability and availability." },
} as const;
const KEY_VALUE: SDProblem = {
  slug: "design-key-value-store", title: "Design a Key-Value Store", difficulty: "Hard",
  summary: "A distributed get/put store that stays available and fault-tolerant - pick consistency and conflict handling.",
  slides: [
    { title: "What we're building", body: "A distributed key-value store: put(key, value) and get(key), spread across many servers.", bullets: ["Must scale to huge data and traffic (partition across nodes).", "Must survive node and network failures (replicate).", "Big tension: consistency vs availability (CAP)."] },
    { title: "Partitioning", body: "Split data across nodes with consistent hashing so the cluster can grow/shrink cheaply.", bullets: ["Each key hashes to a position on the ring; the node clockwise owns it.", "Virtual nodes keep load even.", "Adding a node moves only its neighbor's keys."] },
    { title: "Replication", body: "Copy each key to the next N nodes on the ring so no single failure loses data.", bullets: ["N = replication factor (e.g. 3).", "Reads/writes can go to any replica.", "More replicas = more durability and read capacity, but more to keep in sync."] },
    { title: "CAP & consistency", body: "When the network partitions you must choose: stay consistent or stay available.", quiz: { prompt: "How should reads/writes agree across replicas?", options: [{ id: "strong", label: "Strong everywhere" }, { id: "quorum", label: "Quorum: W + R > N" }, { id: "one", label: "One node only" }], correct: "quorum", why: "Quorum (W write-acks + R read-replies, W + R > N) guarantees a read overlaps the latest write while tolerating some node failures. Strong-everywhere sacrifices availability; one-node sacrifices correctness and durability." } },
    { title: "Conflicts", body: "With multiple writable replicas, two clients can update the same key at once.", quiz: { prompt: "How do you handle concurrent updates?", options: [{ id: "lww", label: "Last-write-wins (clock)" }, { id: "vector", label: "Vector clocks / versioning" }], correct: "vector", why: "Vector clocks detect that two writes were concurrent so you can reconcile both, instead of last-write-wins silently discarding one (and breaking under clock skew)." } },
    { title: "Failures", body: "Round it out with failure handling.", bullets: ["Gossip protocol so nodes learn who's alive.", "Hinted handoff: a temporarily-down replica's writes are held and replayed when it returns.", "Anti-entropy (Merkle trees) to repair divergent replicas."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Clients → Coordinator → Storage Nodes.", "Configure consistency and conflict resolution.", "Check everything."] },
  ],
  palette: [KV.client, KV.coordinator, KV.nodes],
  required: ["client", "coordinator", "storage_nodes"],
  connections: [["client", "coordinator"], ["coordinator", "storage_nodes"]],
  returns: [["storage_nodes", "coordinator"], ["coordinator", "client"]],
  connectionWhy: { "client>coordinator": "Clients send get/put to a coordinator node.", "coordinator>storage_nodes": "The coordinator reads/writes the key's replicas across the storage nodes." },
  missingWhy: { client: "Something must issue get/put.", coordinator: "Without a coordinator nothing routes keys or enforces quorum.", storage_nodes: "Without storage nodes there's nowhere to keep data." },
  layout: { client: { x: 205, y: 30 }, coordinator: { x: 205, y: 170 }, storage_nodes: { x: 205, y: 310 } },
  edgeLabels: { "client>coordinator": "get/put", "coordinator>storage_nodes": "replicate" },
};

// ---------- Web Crawler ----------
const WC = {
  seed: { type: "seed", name: "Seed URLs", blurb: "Starting points", explain: "The initial URLs the crawl starts from. From these, the crawler discovers more links and fans out across the web." },
  frontier: {
    type: "url_frontier", name: "URL Frontier", blurb: "Queue of URLs to crawl",
    explain: "The queue of URLs waiting to be downloaded. It controls the order (which page next) and politeness (don't hammer one site). It's the heart of the crawler.",
    configs: [
      { id: "order", question: "Traversal order?", options: [{ id: "dfs", label: "DFS (stack)" }, { id: "bfs", label: "BFS (queue)" }], correct: "bfs", why: "BFS with a FIFO queue is standard - it spreads the crawl across many sites rather than tunneling deep into one. DFS can go arbitrarily deep down a single domain (and into traps)." },
      { id: "politeness", question: "Avoid overloading a site?", options: [{ id: "none", label: "Crawl as fast as possible" }, { id: "polite", label: "Rate-limit per host + respect robots.txt" }], correct: "polite", why: "Be polite: limit requests per host and obey robots.txt, or you'll get IP-banned and harm the sites. The frontier uses per-host queues with delays to enforce this." },
    ],
  },
  downloader: { type: "downloader", name: "HTML Downloader", blurb: "Fetches pages", explain: "Pulls URLs from the frontier and downloads the HTML, resolving the host via DNS. It's heavily parallel since network I/O dominates." },
  parser: { type: "parser", name: "Parser + Extractor", blurb: "Extracts links", explain: "Parses the downloaded HTML, extracts new links to feed back into the frontier, and passes content on to be stored." },
  dedupe: { type: "dedupe", name: "Seen Cache", blurb: "Skips duplicates", explain: "Tracks URLs and content already seen (often via hashes / a Bloom filter) so the crawler doesn't re-crawl the same page or store duplicate content." },
  storage: { type: "content_storage", name: "Content Storage", blurb: "Stores pages", explain: "Where downloaded page content is saved for indexing/processing - typically object storage given the volume." },
} as const;
const WEB_CRAWLER: SDProblem = {
  slug: "design-web-crawler", title: "Design a Web Crawler", difficulty: "Medium",
  summary: "Crawl billions of pages politely and without duplicates - pick traversal and politeness.",
  slides: [
    { title: "What we're building", body: "A crawler that starts from seed URLs, downloads pages, extracts links, and repeats - at web scale.", bullets: ["Used for search indexing, archiving, data mining.", "Must be scalable, polite, and robust to traps/duplicates."] },
    { title: "The loop", body: "Crawling is a cycle.", bullets: ["Take a URL from the frontier → download HTML → parse → extract links → add new links back to the frontier → store content.", "The frontier (a queue) drives everything."] },
    { title: "Traversal order", body: "The graph of the web is huge; order matters.", quiz: { prompt: "How should the frontier order URLs?", options: [{ id: "dfs", label: "DFS" }, { id: "bfs", label: "BFS (FIFO queue)" }], correct: "bfs", why: "BFS spreads the crawl across many domains and gives a natural place to enforce politeness; DFS tunnels deep into one site and is prone to crawler traps." } },
    { title: "Politeness", body: "Crawling too aggressively gets you banned and hurts sites.", quiz: { prompt: "How do you crawl responsibly?", options: [{ id: "fast", label: "Crawl as fast as possible" }, { id: "polite", label: "Per-host rate limits + robots.txt" }], correct: "polite", why: "Respect robots.txt and add a delay between requests to the same host (per-host queues). Otherwise you overload servers and get your crawler IP-blocked." } },
    { title: "Avoiding duplicates & traps", body: "The web has loops and duplicate content.", bullets: ["URL-seen check (Bloom filter) so you don't re-queue the same URL.", "Content-seen check (content hash) so you don't store the same page twice.", "Bound URL depth/length to avoid infinite 'spider traps'."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Seed → Frontier → Downloader → Parser → (Seen Cache, Content Storage), Parser → Frontier.", "Configure the frontier: order and politeness.", "Check everything."] },
  ],
  palette: [WC.seed, WC.frontier, WC.downloader, WC.parser, WC.dedupe, WC.storage],
  required: ["seed", "url_frontier", "downloader", "parser", "dedupe", "content_storage"],
  connections: [["seed", "url_frontier"], ["url_frontier", "downloader"], ["downloader", "parser"], ["parser", "dedupe"], ["parser", "content_storage"]],
  connectionWhy: { "seed>url_frontier": "Seed URLs prime the frontier to start the crawl.", "url_frontier>downloader": "The downloader pulls the next URL from the frontier.", "downloader>parser": "Downloaded HTML is parsed for links and content.", "parser>dedupe": "Extracted URLs/content are checked against the seen cache before re-queuing/storing.", "parser>content_storage": "Page content is saved for indexing." },
  missingWhy: { seed: "Without seeds the crawl has nowhere to start.", url_frontier: "Without the frontier there's no queue controlling order and politeness.", downloader: "Without the downloader no pages are fetched.", parser: "Without the parser no new links are discovered.", dedupe: "Without a seen cache you re-crawl and store duplicates forever.", content_storage: "Without storage crawled pages aren't kept." },
  layout: { seed: { x: 205, y: 20 }, url_frontier: { x: 205, y: 140 }, downloader: { x: 205, y: 260 }, parser: { x: 205, y: 380 }, dedupe: { x: 40, y: 510 }, content_storage: { x: 380, y: 510 } },
  edgeLabels: { "seed>url_frontier": "seed", "url_frontier>downloader": "next URL", "downloader>parser": "HTML", "parser>dedupe": "check", "parser>content_storage": "store" },
};

// ---------- News Feed ----------
const NF = {
  client: { type: "client", name: "Clients", blurb: "Post & read feed", explain: "Users publish posts and load their home feed (posts from people they follow), newest first." },
  lb: { type: "load_balancer", name: "Load Balancer", blurb: "Spreads traffic", explain: "Fronts the web servers, spreading requests across them and routing around any that fail." },
  web: { type: "api_gateway", name: "Web Servers", blurb: "Stateless entry", explain: "Stateless servers that handle publish and feed-read requests and call the right services. They scale out behind the load balancer." },
  post: { type: "post_service", name: "Post Service", blurb: "Writes posts", explain: "On publish, it stores the post and enqueues a fanout job. It does not deliver to followers itself - that's done asynchronously so publishing stays fast." },
  queue: { type: "queue", name: "Fanout Queue", blurb: "Buffers fanout jobs", explain: "A message queue holding fanout jobs so delivery happens asynchronously and bursts (a viral post) are absorbed without slowing the publish call." },
  workers: {
    type: "workers", name: "Fanout Workers", blurb: "Deliver to feeds",
    explain: "Pull fanout jobs, look up the author's followers in the graph DB, and write the post ID into each follower's feed cache. The central decision is how they fan out.",
    configs: [
      { id: "model", question: "Fanout model?", options: [{ id: "write", label: "Fanout on write (push)" }, { id: "read", label: "Fanout on read (pull)" }, { id: "hybrid", label: "Hybrid" }], correct: "hybrid", why: "Use a hybrid: fanout-on-write for normal users (feeds are precomputed, fast reads), but fanout-on-read for celebrities - pushing one post to 100M followers' feeds is too expensive, so their posts are pulled in at read time." },
    ],
  },
  graph: { type: "graph_db", name: "Graph DB", blurb: "Follower relationships", explain: "Stores who follows whom. Workers query it to find an author's followers; reads at feed time also use it to pull celebrity posts." },
  feedCache: { type: "cache", name: "Feed Cache", blurb: "Precomputed feeds", explain: "Holds each user's feed as a list of post IDs in memory, so opening the app is instant. Workers write into it; web servers read it." },
  postCache: { type: "post_cache", name: "Post Cache", blurb: "Hot posts", explain: "A feed is a list of post IDs; the web servers hydrate them into full posts from this cache (falling back to the post DB on a miss)." },
  postDb: { type: "database", name: "Post DB", blurb: "Durable posts", explain: "The source of truth for post content. Reads are served from the post cache; this is the durable backing store." },
} as const;
const NEWS_FEED: SDProblem = {
  slug: "design-news-feed", title: "Design a News Feed", difficulty: "Hard",
  summary: "Publish posts and build home feeds at scale - choose the fanout strategy.",
  slides: [
    { title: "What we're building", body: "A news feed: users post, and each user's home feed shows recent posts from people they follow, newest first.", bullets: ["Two flows: publish a post, and read a feed.", "Reads dominate; feeds must load fast.", "Some users have tens of millions of followers."] },
    { title: "Two flows", body: "Separate the write and read paths.", bullets: ["Publish: store the post, then get it into followers' feeds (asynchronously, via a queue + workers).", "Read: return the user's prebuilt feed quickly, then hydrate post IDs into full posts.", "The interesting question is how publishing reaches followers."] },
    { title: "Fanout on write", body: "When you post, workers push the post ID into every follower's feed cache.", focus: ["post_service", "queue", "workers", "graph_db", "cache"], bullets: ["Reads are instant - the feed is already built.", "But posting is expensive if you have millions of followers (millions of feed writes per post)."] },
    { title: "Fanout on read", body: "Don't precompute; build the feed by pulling followees' recent posts when the user opens the app.", focus: ["client", "load_balancer", "api_gateway", "graph_db", "post_cache"], bullets: ["Cheap writes.", "But reads are slower and heavier, done on every feed open."] },
    { title: "Pick the model", body: "Most users have few followers; a few have millions.", quiz: { prompt: "Which fanout model scales best overall?", options: [{ id: "write", label: "Fanout on write" }, { id: "read", label: "Fanout on read" }, { id: "hybrid", label: "Hybrid" }], correct: "hybrid", why: "Hybrid: precompute (push) for normal users so reads are instant, but pull celebrities' posts at read time so one post doesn't trigger 100M feed writes. Pure push breaks for celebrities; pure pull makes every read slow." } },
    { title: "Reading the feed", body: "A feed read is two steps.", focus: ["client", "load_balancer", "api_gateway", "cache", "post_cache"], bullets: ["Web servers read the feed cache to get the list of post IDs (instant).", "They hydrate those IDs into full posts from the post cache (DB on a miss).", "This split keeps feeds small in memory and posts shared across many feeds."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Write: Client → LB → Web → Post Service → Post DB + Fanout Queue → Workers → (Graph DB, Feed Cache).", "Read: Web → Feed Cache (IDs) → Post Cache (posts).", "Configure the fanout model, then check."] },
  ],
  palette: [NF.client, NF.lb, NF.web, NF.post, NF.queue, NF.workers, NF.graph, NF.feedCache, NF.postCache, NF.postDb],
  required: ["client", "load_balancer", "api_gateway", "post_service", "queue", "workers", "graph_db", "cache", "post_cache", "database"],
  connections: [
    ["client", "load_balancer"],
    ["load_balancer", "api_gateway"],
    ["api_gateway", "post_service"],
    ["api_gateway", "cache"],
    ["api_gateway", "post_cache"],
    ["post_service", "database"],
    ["post_service", "queue"],
    ["queue", "workers"],
    ["workers", "graph_db"],
    ["workers", "cache"],
  ],
  connectionWhy: {
    "client>load_balancer": "All traffic enters through the load balancer.",
    "load_balancer>api_gateway": "It spreads requests across the stateless web servers.",
    "api_gateway>post_service": "Publishing a post routes to the post service.",
    "api_gateway>cache": "Reading a feed pulls the list of post IDs from the feed cache.",
    "api_gateway>post_cache": "Those post IDs are hydrated into full posts from the post cache.",
    "post_service>database": "The post is stored durably in the post DB.",
    "post_service>queue": "A fanout job is enqueued so delivery happens asynchronously.",
    "queue>workers": "Fanout workers pull jobs from the queue.",
    "workers>graph_db": "Workers look up the author's followers in the graph DB.",
    "workers>cache": "Workers push the post ID into each follower's feed cache.",
  },
  missingWhy: {
    client: "Users post and read feeds.",
    load_balancer: "Without a load balancer the web tier can't scale or survive a server failure.",
    api_gateway: "Without stateless web servers nothing handles requests.",
    post_service: "Without it posts aren't stored or queued for delivery.",
    queue: "Without a queue, fanout is synchronous and a viral post stalls publishing.",
    workers: "Without workers, queued fanout jobs are never delivered to feeds.",
    graph_db: "Without the graph DB, workers can't find an author's followers.",
    cache: "Without a feed cache, every feed open recomputes from scratch - too slow.",
    post_cache: "Without a post cache, hydrating feed IDs hammers the post DB.",
    database: "Without the post DB there's no durable source of truth for posts.",
  },
  layout: {
    client: { x: 205, y: 15 },
    load_balancer: { x: 205, y: 110 },
    api_gateway: { x: 205, y: 205 },
    post_service: { x: 30, y: 310 },
    cache: { x: 380, y: 310 },
    queue: { x: 30, y: 415 },
    post_cache: { x: 380, y: 415 },
    workers: { x: 30, y: 520 },
    graph_db: { x: 205, y: 610 },
    database: { x: 380, y: 520 },
  },
  edgeLabels: {
    "client>load_balancer": "request",
    "load_balancer>api_gateway": "route",
    "api_gateway>post_service": "publish",
    "api_gateway>cache": "read feed",
    "api_gateway>post_cache": "hydrate",
    "post_service>database": "store",
    "post_service>queue": "fanout job",
    "queue>workers": "dequeue",
    "workers>graph_db": "followers",
    "workers>cache": "push IDs",
  },
};

// ---------- Chat System ----------
const CHAT = {
  client: { type: "client", name: "Clients", blurb: "Send/receive msgs", explain: "Chat apps that send messages and must receive them in real time, plus show who's online." },
  api: { type: "api_gateway", name: "API Servers", blurb: "Stateless: login, profile", explain: "Stateless services (behind a load balancer) for non-realtime actions: sign-in, profiles, contacts, group management." },
  chat: {
    type: "chat_servers", name: "Chat Servers", blurb: "Realtime connections",
    explain: "Stateful servers holding a live connection to each online client to push messages instantly. The key decision is the transport that keeps that connection open.",
    configs: [
      { id: "transport", question: "Real-time transport?", options: [{ id: "poll", label: "HTTP polling" }, { id: "longpoll", label: "Long polling" }, { id: "ws", label: "WebSocket" }], correct: "ws", why: "WebSocket gives a persistent, bidirectional connection so the server can push a message the instant it arrives. Polling wastes requests and adds latency; long polling is better but still one-directional and heavier than WebSocket." },
    ],
  },
  store: {
    type: "message_store", name: "Message Store", blurb: "Stores messages",
    explain: "Persists chat history. Messages are write-heavy, accessed by (chat, time), and enormous in volume.",
    configs: [
      { id: "db", question: "Which datastore?", options: [{ id: "relational", label: "Relational DB" }, { id: "kv", label: "Key-value / wide-column" }], correct: "kv", why: "Use a key-value / wide-column store (e.g. it's a huge volume of simple, time-ordered writes keyed by chat). A single relational DB won't keep up with billions of messages; the access pattern is a simple key + range, not complex joins." },
    ],
  },
  presence: { type: "presence_servers", name: "Presence Servers", blurb: "Online status", explain: "Track who's online using heartbeats over the WebSocket and broadcast status changes to a user's contacts." },
  discovery: { type: "coordinator", name: "Service Discovery", blurb: "Picks a chat server", explain: "Tells a connecting client which chat server to attach to (by geography/load), since chat servers are stateful and clients must reach the right one." },
} as const;
const CHAT_SYSTEM: SDProblem = {
  slug: "design-chat-system", title: "Design a Chat System", difficulty: "Hard",
  summary: "Real-time 1:1 and group messaging with presence - pick the transport and message store.",
  slides: [
    { title: "What we're building", body: "A chat app: 1:1 and group messages delivered in real time, with online/offline presence and message history.", bullets: ["Low latency delivery is the whole point.", "Two kinds of traffic: real-time messaging and ordinary requests (login, profile)."] },
    { title: "Stateless vs stateful", body: "Split the system by traffic type.", focus: ["client", "api_gateway", "chat_servers"], bullets: ["Stateless services handle login, profiles, group settings - scale like any web tier.", "Stateful chat servers keep a live connection per online user to push messages instantly."] },
    { title: "The transport", body: "How does the server send a message to a client the moment it arrives?", quiz: { prompt: "Which transport for real-time delivery?", options: [{ id: "poll", label: "HTTP polling" }, { id: "longpoll", label: "Long polling" }, { id: "ws", label: "WebSocket" }], correct: "ws", why: "WebSocket holds a persistent, two-way connection so the server pushes messages instantly with minimal overhead. Polling is wasteful and laggy; long polling is one-way and heavier." } },
    { title: "Storing messages", body: "Message volume is enormous and the access pattern is simple.", focus: ["chat_servers", "message_store"], quiz: { prompt: "Which datastore for messages?", options: [{ id: "relational", label: "Relational DB" }, { id: "kv", label: "Key-value / wide-column" }], correct: "kv", why: "A key-value/wide-column store fits billions of time-ordered writes keyed by chat ID; you fetch by (chat, time range), not joins. A single relational DB can't scale to this write volume." } },
    { title: "Connecting & presence", body: "Two more pieces.", focus: ["client", "coordinator", "chat_servers", "presence_servers"], bullets: ["Service discovery hands a connecting client the right chat server (they're stateful).", "Presence uses heartbeats over the WebSocket; missed heartbeats → offline, broadcast to contacts."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Client → API Servers (stateless) and Client → Chat Servers (realtime); Chat Servers → Message Store and → Presence; Client → Service Discovery.", "Configure transport and message store.", "Check everything."] },
  ],
  palette: [CHAT.client, CHAT.api, CHAT.chat, CHAT.store, CHAT.presence, CHAT.discovery],
  required: ["client", "api_gateway", "chat_servers", "message_store", "presence_servers", "coordinator"],
  connections: [["client", "coordinator"], ["client", "api_gateway"], ["client", "chat_servers"], ["chat_servers", "message_store"], ["chat_servers", "presence_servers"]],
  connectionWhy: { "client>coordinator": "On connect, service discovery tells the client which chat server to use.", "client>api_gateway": "Non-realtime actions (login, profile) go to the stateless API servers.", "client>chat_servers": "The client opens a persistent connection to a chat server for messaging.", "chat_servers>message_store": "Chat servers persist every message to the store.", "chat_servers>presence_servers": "Chat servers report heartbeats so presence knows who's online." },
  missingWhy: { client: "Users send and receive messages.", api_gateway: "Without stateless servers, login/profile have no home.", chat_servers: "Without chat servers there's no real-time delivery.", message_store: "Without a store, history is lost.", presence_servers: "Without presence there's no online/offline status.", coordinator: "Without discovery, clients can't find the right stateful chat server." },
  layout: { client: { x: 205, y: 20 }, coordinator: { x: 40, y: 150 }, api_gateway: { x: 380, y: 150 }, chat_servers: { x: 205, y: 280 }, message_store: { x: 40, y: 410 }, presence_servers: { x: 380, y: 410 } },
  edgeLabels: { "client>coordinator": "which server?", "client>api_gateway": "login", "client>chat_servers": "WebSocket", "chat_servers>message_store": "persist", "chat_servers>presence_servers": "heartbeat" },
};

// ---------- Search Autocomplete ----------
const AC = {
  client: { type: "client", name: "Clients", blurb: "Type queries", explain: "Users type into a search box and expect the top suggestions to appear within milliseconds on every keystroke." },
  query: {
    type: "query_service", name: "Query Service", blurb: "Returns top-k",
    explain: "On each keystroke it returns the top suggestions for the current prefix. It must be extremely fast and read from a precomputed structure, not scan a database.",
    configs: [
      { id: "structure", question: "Lookup data structure?", options: [{ id: "sql_like", label: "SQL LIKE 'prefix%'" }, { id: "hashmap", label: "Hash map of prefixes" }, { id: "trie", label: "Trie (with cached top-k)" }], correct: "trie", why: "A trie maps a prefix to suggestions in O(prefix length); caching the top-k results at each node makes lookups near-instant. SQL LIKE scans and is far too slow per keystroke; a flat hash map of every prefix is huge and hard to keep ranked." },
    ],
  },
  cache: { type: "trie_cache", name: "Trie Cache", blurb: "Trie in memory", explain: "The trie lives in memory (Redis/app memory) so prefix lookups never hit disk. Read-only at query time; rebuilt offline." },
  aggregator: {
    type: "aggregator", name: "Aggregation Service", blurb: "Builds the trie",
    explain: "Offline workers count query frequencies from logs and rebuild the trie with top-k per node. The decision is how often to rebuild.",
    configs: [
      { id: "freq", question: "Update frequency?", options: [{ id: "realtime", label: "Rebuild on every query" }, { id: "batch", label: "Rebuild periodically (batch)" }], correct: "batch", why: "Rebuild in batches (e.g. hourly/daily) from aggregated logs. Suggestions don't need to be real-time, and rebuilding per query would be enormously expensive. Batch keeps query-time reads fast and cheap." },
    ],
  },
  db: { type: "database", name: "Analytics Logs / DB", blurb: "Raw query logs", explain: "Stores the raw search queries that the aggregation service counts to decide which suggestions are popular." },
} as const;
const AUTOCOMPLETE: SDProblem = {
  slug: "design-search-autocomplete", title: "Design Search Autocomplete", difficulty: "Medium",
  summary: "Return the top suggestions for a prefix in milliseconds - pick the structure and update model.",
  slides: [
    { title: "What we're building", body: "Type-ahead search: as the user types, show the top few most-popular completions of the current prefix.", bullets: ["Fires on every keystroke → must be a few ms.", "Suggestions ranked by popularity (query frequency).", "Read-heavy; freshness can lag a bit."] },
    { title: "The naive way fails", body: "Querying a database for matching strings on every keystroke is far too slow.", bullets: ["SQL LIKE 'pre%' scans large tables.", "You'd do it on every character for every user - impossible at scale."] },
    { title: "The trie", body: "A trie (prefix tree) maps each prefix to its completions efficiently.", art: "trie", bullets: ["Walk the prefix once (O(length)).", "Cache the top-k suggestions at each node so you return them instantly without searching the subtree."] },
    { title: "Pick the structure", body: "Per-keystroke latency is the constraint.", quiz: { prompt: "What should back the lookups?", options: [{ id: "sql", label: "SQL LIKE" }, { id: "hashmap", label: "Hash map of every prefix" }, { id: "trie", label: "Trie with cached top-k" }], correct: "trie", why: "A trie with top-k cached at each node returns suggestions in O(prefix length) with no scan. SQL LIKE is too slow per keystroke; storing every prefix in a hash map is huge and awkward to keep ranked." } },
    { title: "Keeping it fresh", body: "Popularity changes over time, but not by the second.", quiz: { prompt: "How often to rebuild the trie?", options: [{ id: "realtime", label: "On every query" }, { id: "batch", label: "Periodic batch from logs" }], correct: "batch", why: "Rebuild in batches from aggregated query logs - suggestions don't need to be instant-fresh, and rebuilding per query would crush the system. Query-time stays a fast, read-only trie lookup." } },
    { title: "Now build it", body: "Assemble it.", bullets: ["Client → Query Service → Trie Cache; Aggregation Service → Trie Cache; Aggregation Service ← Logs DB.", "Configure the structure and update frequency.", "Check everything."] },
  ],
  palette: [AC.client, AC.query, AC.cache, AC.aggregator, AC.db],
  required: ["client", "query_service", "trie_cache", "aggregator", "database"],
  connections: [["client", "query_service"], ["query_service", "trie_cache"], ["aggregator", "trie_cache"], ["aggregator", "database"]],
  // Read path returns suggestions to the user; the aggregator path is offline (no return).
  returns: [["trie_cache", "query_service"], ["query_service", "client"]],
  connectionWhy: { "client>query_service": "Each keystroke asks the query service for suggestions.", "query_service>trie_cache": "The query service reads top-k from the in-memory trie.", "aggregator>trie_cache": "The aggregation service rebuilds and publishes the trie.", "aggregator>database": "It reads raw query logs to compute popularity." },
  missingWhy: { client: "Users type the prefixes.", query_service: "Without it there's nothing answering keystrokes.", trie_cache: "Without the in-memory trie, lookups are too slow.", aggregator: "Without aggregation the trie is never built or updated.", database: "Without query logs there's no popularity data to rank by." },
  layout: { client: { x: 205, y: 30 }, query_service: { x: 205, y: 160 }, trie_cache: { x: 205, y: 290 }, aggregator: { x: 380, y: 420 }, database: { x: 380, y: 540 } },
  edgeLabels: { "client>query_service": "prefix", "query_service>trie_cache": "top-k", "aggregator>trie_cache": "rebuild", "aggregator>database": "read logs" },
};

// ---------- YouTube ----------
const YT = {
  client: { type: "client", name: "Clients", blurb: "Upload & watch", explain: "Users upload videos and stream them. Watching dominates, and viewers are spread worldwide." },
  api: { type: "api_gateway", name: "API Servers", blurb: "Metadata & requests", explain: "Stateless servers for upload requests, metadata, and serving watch pages - behind a load balancer." },
  transcoder: { type: "transcoder", name: "Transcoding Pipeline", blurb: "Encodes formats", explain: "After upload, workers transcode the raw video into many resolutions/codecs (and create thumbnails) so it plays on any device and network. This is CPU-heavy and runs as a pipeline of jobs." },
  storage: {
    type: "object_storage", name: "Object Storage", blurb: "Raw + encoded video",
    explain: "Stores the original and all transcoded versions. Videos are huge binary files.",
    configs: [
      { id: "store", question: "Where to store videos?", options: [{ id: "db", label: "In the database" }, { id: "object", label: "Object storage (S3)" }], correct: "object", why: "Store videos in object storage. Databases are for structured queries, not gigabyte binaries - object storage scales infinitely, replicates for durability, and integrates with a CDN." },
    ],
  },
  cdn: {
    type: "cdn", name: "CDN", blurb: "Serves video to viewers",
    explain: "Caches transcoded video at edge servers worldwide so viewers stream from a nearby location with low latency. The decision is how watch traffic is served.",
    configs: [
      { id: "deliver", question: "How to deliver video to viewers?", options: [{ id: "appservers", label: "Stream from app servers" }, { id: "cdn", label: "Serve via CDN" }], correct: "cdn", why: "Serve via CDN. Video is the bulk of traffic; edge caching cuts latency for global viewers and offloads enormous bandwidth from your origin. Streaming from app servers won't scale and is slow far from the origin." },
    ],
  },
  metadata: { type: "database", name: "Metadata DB", blurb: "Titles, users, refs", explain: "Stores video metadata (title, description, owner, view count) and pointers to the files in object storage - small structured data, separate from the video bytes." },
  queue: { type: "queue", name: "Message Queue", blurb: "Transcode jobs", explain: "Buffers upload events so the transcoding pipeline can pick up jobs asynchronously and scale workers to demand." },
} as const;
const YOUTUBE: SDProblem = {
  slug: "design-youtube", title: "Design YouTube", difficulty: "Hard",
  summary: "Upload, transcode, and stream video globally - choose storage and delivery.",
  slides: [
    { title: "What we're building", body: "A video platform: upload videos and stream them smoothly to a global audience on any device.", bullets: ["Two flows: upload (rare, heavy) and watch (constant, huge bandwidth).", "Videos are enormous files; viewers are worldwide."] },
    { title: "Upload flow", body: "Uploading is more than saving a file.", focus: ["client", "api_gateway", "queue", "transcoder", "object_storage", "database"], bullets: ["Store the raw video, then transcode it into many resolutions/codecs + thumbnails.", "Transcoding is CPU-heavy → run it as async jobs off a queue.", "Metadata (title, owner) is saved separately from the bytes."] },
    { title: "Where to store video", body: "Videos are gigabyte-scale binaries.", quiz: { prompt: "Where do the video files go?", options: [{ id: "db", label: "In the database" }, { id: "object", label: "Object storage" }], correct: "object", why: "Object storage: it scales infinitely, replicates for durability, and pairs with a CDN. Databases are for structured data and choke on huge binaries." } },
    { title: "Watch flow", body: "Watching is the dominant traffic and viewers are global.", focus: ["object_storage", "cdn", "client"], quiz: { prompt: "How should video be delivered to viewers?", options: [{ id: "app", label: "Stream from app servers" }, { id: "cdn", label: "Serve via CDN" }], correct: "cdn", why: "A CDN caches video at edge servers near viewers - low latency globally and massive bandwidth offload from your origin. App servers can't carry that load or that geography." } },
    { title: "Putting it together", body: "The pieces and their roles.", bullets: ["Client → API → (Object Storage for raw, Queue for transcode jobs).", "Queue → Transcoding Pipeline → Object Storage (encoded).", "Metadata DB holds titles/refs; CDN serves the encoded video to viewers."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Wire upload + transcode + metadata + delivery.", "Configure storage (object) and delivery (CDN).", "Check everything."] },
  ],
  palette: [YT.client, YT.api, YT.queue, YT.transcoder, YT.storage, YT.cdn, YT.metadata],
  required: ["client", "api_gateway", "queue", "transcoder", "object_storage", "cdn", "database"],
  connections: [["client", "api_gateway"], ["api_gateway", "queue"], ["api_gateway", "database"], ["queue", "transcoder"], ["transcoder", "object_storage"], ["object_storage", "cdn"], ["cdn", "client"]],
  connectionWhy: { "client>api_gateway": "Uploads and watch requests enter through the API servers.", "api_gateway>queue": "Each upload enqueues a transcoding job.", "api_gateway>database": "Video metadata (title, owner, refs) is written to the metadata DB.", "queue>transcoder": "The transcoding pipeline pulls jobs from the queue.", "transcoder>object_storage": "Encoded renditions are written to object storage.", "object_storage>cdn": "The CDN pulls encoded video from object storage to cache at the edge.", "cdn>client": "Viewers stream the video from the nearest CDN edge." },
  missingWhy: { client: "Users upload and watch.", api_gateway: "Without an entry point nothing routes upload/watch.", queue: "Without a queue, heavy transcoding blocks uploads.", transcoder: "Without transcoding, video won't play across devices/networks.", object_storage: "Without object storage there's nowhere durable for the huge files.", cdn: "Without a CDN, global streaming is slow and overloads the origin.", database: "Without the metadata DB there are no titles, owners, or file references." },
  layout: { client: { x: 205, y: 20 }, api_gateway: { x: 205, y: 130 }, database: { x: 40, y: 250 }, queue: { x: 380, y: 250 }, transcoder: { x: 380, y: 370 }, object_storage: { x: 205, y: 490 }, cdn: { x: 40, y: 370 } },
  edgeLabels: { "client>api_gateway": "upload/watch", "api_gateway>queue": "job", "api_gateway>database": "metadata", "queue>transcoder": "dequeue", "transcoder>object_storage": "encoded", "object_storage>cdn": "origin pull", "cdn>client": "stream" },
};

// ---------- Google Drive ----------
const GD = {
  client: { type: "client", name: "Clients", blurb: "Upload/sync files", explain: "Desktop and mobile clients that upload files and keep them in sync across a user's devices." },
  api: { type: "api_gateway", name: "API Servers", blurb: "Requests + auth", explain: "Stateless servers (behind a load balancer) for auth, upload/download requests, and sharing." },
  block: {
    type: "block_servers", name: "Block Servers", blurb: "Split files into blocks",
    explain: "Split each file into fixed-size blocks, and on changes only handle the blocks that changed. They also dedupe identical blocks by hash. This is what makes sync efficient.",
    configs: [
      { id: "sync", question: "How to sync changes?", options: [{ id: "whole", label: "Re-upload the whole file" }, { id: "delta", label: "Delta sync (changed blocks only)" }], correct: "delta", why: "Delta sync: split files into blocks and transfer only the blocks that changed. Re-uploading a whole multi-GB file on a one-line edit wastes bandwidth and is slow; block-level sync (plus dedupe) is how Drive/Dropbox stay fast." },
    ],
  },
  storage: {
    type: "object_storage", name: "Object Storage", blurb: "Stores file blocks",
    explain: "The actual file blocks live in object storage (replicated, versioned). Metadata is kept separately.",
    configs: [
      { id: "store", question: "Where do file contents live?", options: [{ id: "db", label: "Whole files in the database" }, { id: "object", label: "Blocks in object storage" }], correct: "object", why: "Store file blocks in object storage - it scales and is built for large binaries, with versioning and durable replication. Putting whole files in a database doesn't scale and bloats it." },
    ],
  },
  metadata: { type: "database", name: "Metadata DB", blurb: "Files, versions, sharing", explain: "Stores the file/folder tree, block lists, versions, and sharing permissions - small structured data the clients reconcile against." },
  notify: { type: "notification_service", name: "Notification Service", blurb: "Push changes to devices", explain: "When a file changes, it notifies the user's other online devices so they pull the updated blocks - keeping everything in sync in near real time." },
} as const;
const GOOGLE_DRIVE: SDProblem = {
  slug: "design-google-drive", title: "Design Google Drive", difficulty: "Hard",
  summary: "Store and sync files across devices efficiently - choose block storage and delta sync.",
  slides: [
    { title: "What we're building", body: "A file storage + sync service: upload files, access them anywhere, and keep them in sync across all your devices, with sharing and version history.", bullets: ["Reliable storage (never lose a file).", "Efficient sync (don't move data you don't have to).", "Near-real-time updates across devices."] },
    { title: "Files as blocks", body: "Treat a file as a sequence of fixed-size blocks, not one blob.", bullets: ["Edit a file → only the changed blocks differ.", "Identical blocks can be deduplicated by hash (store once).", "Blocks make versioning and partial transfer possible."] },
    { title: "Where contents live", body: "File data is large and binary; metadata is small and structured.", quiz: { prompt: "Where should file contents be stored?", options: [{ id: "db", label: "Whole files in the database" }, { id: "object", label: "Blocks in object storage" }], correct: "object", why: "Blocks in object storage - it's built for large binaries, scales, and replicates durably. Keep only metadata (tree, versions, block lists, permissions) in the database." } },
    { title: "Efficient sync", body: "A user edits one line of a big file. What gets uploaded?", quiz: { prompt: "How should the client sync a change?", options: [{ id: "whole", label: "Re-upload the whole file" }, { id: "delta", label: "Delta sync - changed blocks only" }], correct: "delta", why: "Delta sync transfers only the changed blocks (plus dedupe of identical blocks). Re-uploading whole files wastes bandwidth and time; block-level diffs are how Drive/Dropbox feel instant." } },
    { title: "Keeping devices in sync", body: "Other devices need to know when something changed.", bullets: ["A notification service pushes 'file changed' to the user's online devices.", "They then pull just the new blocks from object storage.", "Metadata DB is the source of truth they reconcile against."] },
    { title: "Now build it", body: "Assemble it.", bullets: ["Client → API → Block Servers → Object Storage; API → Metadata DB; Notification Service → Client.", "Configure block storage and delta sync.", "Check everything."] },
  ],
  palette: [GD.client, GD.api, GD.block, GD.storage, GD.metadata, GD.notify],
  required: ["client", "api_gateway", "block_servers", "object_storage", "database", "notification_service"],
  connections: [["client", "api_gateway"], ["api_gateway", "block_servers"], ["block_servers", "object_storage"], ["api_gateway", "database"], ["notification_service", "client"]],
  connectionWhy: { "client>api_gateway": "Clients send upload/download/sync requests to the API servers.", "api_gateway>block_servers": "Uploads go to block servers that split files into blocks.", "block_servers>object_storage": "Blocks are stored (and deduped) in object storage.", "api_gateway>database": "File metadata, versions, and permissions are written to the metadata DB.", "notification_service>client": "When a file changes, the notification service tells the user's other devices to sync." },
  missingWhy: { client: "Users upload and sync files.", api_gateway: "Without an entry point nothing handles requests/auth.", block_servers: "Without block servers there's no chunking, dedupe, or delta sync.", object_storage: "Without object storage there's nowhere durable for the file blocks.", database: "Without the metadata DB there's no file tree, versions, or sharing.", notification_service: "Without notifications, other devices don't know to sync." },
  layout: { client: { x: 205, y: 20 }, api_gateway: { x: 205, y: 140 }, block_servers: { x: 205, y: 260 }, object_storage: { x: 205, y: 380 }, database: { x: 40, y: 200 }, notification_service: { x: 380, y: 140 } },
  edgeLabels: { "client>api_gateway": "request", "api_gateway>block_servers": "upload", "block_servers>object_storage": "blocks", "api_gateway>database": "metadata", "notification_service>client": "changed" },
};

export const SD_PROBLEMS: SDProblem[] = [
  URL_SHORTENER,
  RATE_LIMITER,
  UNIQUE_ID,
  NOTIFICATION,
  CONSISTENT_HASHING,
  KEY_VALUE,
  WEB_CRAWLER,
  NEWS_FEED,
  CHAT_SYSTEM,
  AUTOCOMPLETE,
  YOUTUBE,
  GOOGLE_DRIVE,
];
