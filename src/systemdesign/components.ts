// Reference library of the main reusable building blocks of system design. Each
// follows the same shape: the problem it solves, how it works, and common
// implementations with trade-offs. Rendered with a schematic diagram.

export type SDImpl = { name: string; desc: string };

export type SDComponentDoc = {
  id: string;
  name: string;
  tagline: string;
  problem: string[];
  how: string[];
  implementations: SDImpl[];
};

export const COMPONENT_DOCS: SDComponentDoc[] = [
  {
    id: "microservices",
    name: "Microservices",
    tagline: "Split one big app into independent services, each owning one job.",
    problem: [
      "A monolith puts product, checkout, payments, and accounts in one codebase. At low traffic it's fine.",
      "As it grows you can't scale just checkout - you scale everything. Teams can't deploy independently, and one bug in the catalog can crash the whole app.",
      "Microservices split the app into independent services (Product, Cart, User, Order, Payment) that deploy, scale, and fail independently.",
    ],
    how: [
      "Each service runs as its own process and talks to others over APIs (REST/HTTP or gRPC).",
      "Each service owns its own database - no service reads another's DB directly, which avoids tight coupling.",
      "Service discovery: services register with a registry (Consul, Eureka) so others can find their location.",
      "Independent scaling: spin up 10 Order instances on Black Friday while Product stays at 2.",
      "Fault isolation: circuit breakers stop calling a broken service, so one failure doesn't cascade.",
    ],
    implementations: [
      { name: "Spring Boot (Java)", desc: "Mature enterprise tooling, strong typing, built-in discovery and tracing." },
      { name: "Node.js + Express", desc: "Lightweight, fast to build, huge npm ecosystem; great for TS teams." },
      { name: "Go (Gin/Echo)", desc: "High throughput, low latency, built-in concurrency for hot paths." },
    ],
  },
  {
    id: "relational",
    name: "Relational Databases",
    tagline: "Structured tables + ACID transactions when correctness is critical.",
    problem: [
      "A bank transfer must subtract from A and add to B - both succeed or both fail. Partial completion loses money.",
      "This needs consistency: data stays accurate across related records.",
      "Relational databases give structured storage and ACID transactions - guarantees over flexibility.",
    ],
    how: [
      "Data lives in tables of rows and columns; each table is an entity (Users, Orders, Products).",
      "Primary key uniquely identifies a row; foreign key links rows across tables (Orders.user_id → Users).",
      "Relationships: one-to-one, one-to-many, and many-to-many (via a junction table).",
      "ACID: Atomic (all-or-nothing), Consistent (valid state to valid state), Isolated (no interference), Durable (survives crashes).",
      "SQL joins, filters (WHERE), and aggregates (GROUP BY) express complex business logic.",
    ],
    implementations: [
      { name: "PostgreSQL", desc: "Most feature-rich OSS DB: JSON, arrays, full-text search; great for complex queries." },
      { name: "MySQL", desc: "Most widely deployed; excellent reads and simple replication." },
      { name: "Amazon RDS", desc: "Managed Postgres/MySQL; handles backups, patches, scaling for you." },
    ],
  },
  {
    id: "nosql",
    name: "NoSQL Databases",
    tagline: "Flexible, schema-less storage that scales horizontally.",
    problem: [
      "An Instagram post has image, caption, hashtags, comments with nested replies. Fitting that into relational tables needs many joins.",
      "The schema changes weekly (stories, polls), and every change means a migration. Development slows.",
      "NoSQL stores flexible, nested data without rigid schemas, trading relational guarantees for flexibility and horizontal scale.",
    ],
    how: [
      "Key-value (Redis, Memcached): a hash map - key → value. Great for caching and sessions.",
      "Document (MongoDB): self-contained JSON documents with nested fields. Great for varying schemas.",
      "Column-family (Cassandra): data organized by column; great for high-write, time-series, logs.",
      "Graph (Neo4j): nodes and edges as first-class citizens; great for social graphs and recommendations.",
      "Most offer eventual consistency: writes propagate within seconds; strong consistency is optional but costs availability.",
    ],
    implementations: [
      { name: "MongoDB", desc: "Popular document DB; rich queries and aggregations for varying schemas." },
      { name: "Redis", desc: "In-memory key-value, sub-ms latency; caching, leaderboards, rate limiting." },
      { name: "Cassandra", desc: "Distributed column-family, no single point of failure; millions of writes/sec." },
      { name: "DynamoDB", desc: "Managed key-value/document; auto-scales with single-digit-ms latency." },
    ],
  },
  {
    id: "object_storage",
    name: "Object Storage",
    tagline: "Store huge files as objects with a unique key - scales automatically.",
    problem: [
      "Video files, profile pictures, thumbnails range from KB to GB. Relational DBs are inefficient for large binaries.",
      "Plain file systems don't scale: one server holds limited storage, and partitioning/replication get complex.",
      "Object storage treats each file as an object with a unique key and handles distribution, replication, and scaling for you.",
    ],
    how: [
      "Objects live in buckets; each object = a unique key (photos/cat.jpg) + binary data + metadata.",
      "Storage is flat - keys look like paths but there are no real folders.",
      "Access via REST: PUT to upload, GET to download, DELETE to remove.",
      "Data is auto-replicated across nodes/regions (3+ copies) for high durability.",
      "Versioning keeps old copies; lifecycle policies move cold data to cheaper tiers or delete it.",
    ],
    implementations: [
      { name: "Amazon S3", desc: "Industry standard; near-unlimited storage and strong read-after-write consistency." },
      { name: "Google Cloud Storage", desc: "Multi-regional, integrates with BigQuery for analytics." },
      { name: "Azure Blob Storage", desc: "Hot/cool/archive tiers for cost control; great for Azure apps." },
    ],
  },
  {
    id: "cache",
    name: "Cache",
    tagline: "Keep hot data in fast memory so reads skip the database.",
    problem: [
      "A product page queries the DB every load; most requests fetch the same 100 popular items.",
      "Each query takes ~50ms, DB CPU hits 90%, and adding DB servers is expensive.",
      "A cache stores frequently-read data in memory, dropping response time from ~50ms to ~1ms and DB load by ~80%.",
    ],
    how: [
      "App checks cache first. Hit → return immediately. Miss → query DB, store result, return.",
      "Cache-aside: app manages the cache. Alternatives: write-through (write cache+DB together), write-behind (cache first, sync later).",
      "Eviction when full: LRU (least recently used), LFU (least frequently used), or TTL (expire after time).",
      "Invalidation keeps data fresh: set a TTL, or delete an entry explicitly when its data changes.",
      "Trade-off: longer TTL = less DB load but staler data; shorter TTL = fresher data but more DB hits.",
    ],
    implementations: [
      { name: "Redis", desc: "Sub-ms in-memory cache with rich data structures; sessions, leaderboards, general caching." },
      { name: "Memcached", desc: "Simpler key-value cache; faster for basic ops, fewer features." },
      { name: "CDN (Cloudflare)", desc: "Distributed cache for static assets at edge locations." },
    ],
  },
  {
    id: "cdn",
    name: "CDN (Content Delivery Network)",
    tagline: "Cache static content on edge servers near users worldwide.",
    problem: [
      "A video in a New York data center takes ~200ms to reach a user in Tokyo. It stutters.",
      "Millions watching the same video hammer the origin server; bandwidth costs spike and requests time out.",
      "A CDN caches static content on edge servers globally, so Tokyo users fetch from Tokyo (~5ms) and the origin sees far less load.",
    ],
    how: [
      "Static files replicate to hundreds of edge servers in major cities.",
      "DNS routes each user to the nearest edge. Hit → served instantly; miss → edge fetches from origin, caches, then serves.",
      "TTL controls freshness: 24h for a logo, 5 min for fast-changing content; on expiry the edge re-fetches.",
      "Result: lower latency (proximity), less origin load (cached copies), better availability (traffic spread out).",
    ],
    implementations: [
      { name: "Cloudflare", desc: "Global CDN with DDoS protection and WAF; easy setup, free tier." },
      { name: "AWS CloudFront", desc: "Integrates with S3 and Lambda@Edge; programmatic cache control." },
      { name: "Akamai", desc: "Largest edge network; advanced image optimization and prefetching." },
    ],
  },
  {
    id: "message_queue",
    name: "Message Queues",
    tagline: "Decouple services and buffer spikes with reliable async messaging.",
    problem: [
      "On Black Friday the Order Service waits 2s per payment synchronously; orders pile up and users time out.",
      "If Payment crashes for 30s, thousands of orders fail with no retry - revenue lost.",
      "A queue lets Order respond instantly and Payment process at its own pace; if Payment crashes, messages wait and resume later.",
    ],
    how: [
      "Producers publish messages to the queue (e.g. an order JSON).",
      "The queue stores messages durably on disk, so they survive crashes until a consumer is ready.",
      "Consumers pull messages, process them, then send an acknowledgment so the queue deletes them.",
      "No ack on failure → the message is re-delivered (at-least-once delivery); nothing is lost.",
      "Dead-letter queues hold poison messages after N failures; FIFO queues preserve order, standard queues maximize throughput.",
    ],
    implementations: [
      { name: "RabbitMQ", desc: "Traditional broker with flexible routing and acknowledgments." },
      { name: "Apache Kafka", desc: "Distributed event streaming; millions of msgs/sec, retained for replay." },
      { name: "AWS SQS", desc: "Fully managed queue, zero ops, auto-scales to any volume." },
    ],
  },
  {
    id: "api_gateway",
    name: "API Gateway",
    tagline: "One entry point that routes, authenticates, and aggregates.",
    problem: [
      "A mobile app talking to 12 services juggles 12 endpoints, 12 auth schemes, and 12 retry strategies.",
      "Loading one screen needs 5 sequential calls (~500ms), and with no rate limiting one abuser can crash a service.",
      "An API gateway sits between clients and services: clients call one endpoint and it routes, authenticates, rate-limits, and aggregates.",
    ],
    how: [
      "Clients send everything to the gateway; it routes by path/method (GET /users/123 → User Service).",
      "Cross-cutting concerns in one place: JWT auth, rate limiting (429 when exceeded), response caching.",
      "Request aggregation: GET /home fans out to several services in parallel and merges one response.",
      "Load balancing distributes requests across service instances (e.g. round-robin).",
      "Centralized logging of timestamps, latencies, and error rates simplifies monitoring.",
    ],
    implementations: [
      { name: "AWS API Gateway", desc: "Managed; integrates with Lambda/DynamoDB; auth, throttling, caching built in." },
      { name: "Kong", desc: "OSS gateway on NGINX with a plugin system; great self-hosted." },
      { name: "NGINX Plus", desc: "Reverse proxy + gateway; high performance, fine-grained routing control." },
    ],
  },
  {
    id: "load_balancer",
    name: "Load Balancer",
    tagline: "Spread traffic across servers for scale and failover.",
    problem: [
      "If clients connect to one web server directly, that server is a single point of failure - if it dies, the site is down. And one machine can only handle so much traffic.",
      "You can't keep scaling one box up forever (vertical scaling has hard limits and no redundancy).",
      "A load balancer takes the public traffic and distributes it across a pool of servers, so you scale out by adding servers and survive any one failing.",
    ],
    how: [
      "Clients connect to the load balancer's public IP; it forwards to servers over private IPs (servers aren't exposed directly).",
      "Health checks: it stops sending traffic to a server that fails checks, and routes around it automatically.",
      "Add capacity by adding servers to the pool - the LB starts using them with no client changes.",
      "Algorithms: round-robin (rotate), least-connections (pick the least busy), IP-hash (sticky by client).",
      "Layer 4 (TCP, fast, connection-level) vs Layer 7 (HTTP, can route by path/headers).",
    ],
    implementations: [
      { name: "NGINX / HAProxy", desc: "Popular software load balancers; flexible Layer 7 routing." },
      { name: "AWS ALB / NLB", desc: "Managed: ALB for HTTP (Layer 7), NLB for raw TCP (Layer 4) at scale." },
      { name: "Cloud LB (GCP/Azure)", desc: "Managed global load balancing with health checks and autoscaling." },
    ],
  },
  {
    id: "db_replication",
    name: "Database Replication",
    tagline: "Copy data to multiple DBs for read scale and reliability.",
    problem: [
      "A single database is a single point of failure, and most apps read far more than they write - one DB becomes the bottleneck.",
      "If that DB is lost (hardware failure, disaster), so is your data.",
      "Replication keeps copies of the data on multiple servers, typically one primary (writes) and several replicas (reads).",
    ],
    how: [
      "Primary (master) handles all writes; replicas (slaves) copy its data and serve reads.",
      "Reads scale by spreading them across many replicas - more queries run in parallel.",
      "Reliability/availability: if a replica dies, reads go to others; if the primary dies, a replica is promoted to primary.",
      "Replication lag: replicas can be slightly behind the primary, so a just-written value may not appear on a replica immediately (read-your-writes considerations).",
      "More reads than writes is why systems usually have many replicas per primary.",
    ],
    implementations: [
      { name: "PostgreSQL / MySQL replication", desc: "Built-in primary→replica streaming replication." },
      { name: "Amazon RDS read replicas", desc: "Managed replicas with automatic failover (Multi-AZ)." },
      { name: "Redis replication", desc: "Primary→replica for cache read scale and failover." },
    ],
  },
  {
    id: "sharding",
    name: "Sharding (Horizontal Partitioning)",
    tagline: "Split one big dataset across many databases.",
    problem: [
      "Replication scales reads, but all writes still go to one primary, and one machine can only hold and write so much data.",
      "When data outgrows a single server, you must split it.",
      "Sharding breaks a large database into smaller pieces (shards), each holding a unique slice of the data on its own server.",
    ],
    how: [
      "A shard key (e.g. user_id) decides which shard a row lives on - often hash(key) % N.",
      "Each shard has the same schema but different rows; queries route to the right shard by the key.",
      "Choose a key that spreads data evenly to avoid hot shards.",
      "Resharding: when a shard fills up you must move data and update the hash - consistent hashing reduces how much moves.",
      "Trade-offs: the celebrity/hotspot problem (one popular key overloads a shard) and hard cross-shard joins (often solved by de-normalizing).",
    ],
    implementations: [
      { name: "Cassandra / DynamoDB", desc: "Partition data across nodes by key automatically." },
      { name: "Vitess (MySQL)", desc: "Adds horizontal sharding on top of MySQL." },
      { name: "MongoDB sharding", desc: "Built-in sharded clusters with a shard key." },
    ],
  },
];
