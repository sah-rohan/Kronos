// Deep cloud-engineering reference covering AWS and Azure side by side. Each
// topic: what it is and when to use it, how it works (modular), and the
// equivalent services on each cloud.
import type { SDHow } from "./components";

export type CloudService = { name: string; desc: string };

export type CloudDoc = {
  id: string;
  name: string;
  tagline: string;
  what: string[];
  how: SDHow[];
  aws: CloudService[];
  azure: CloudService[];
};

export const CLOUD_DOCS: CloudDoc[] = [
  {
    id: "compute",
    name: "Virtual Machines (Compute)",
    tagline: "Rent servers by the second instead of buying hardware.",
    what: [
      "A virtual machine is a full server (CPU, RAM, disk, OS) you rent on demand and pay for only while it runs.",
      "It's the most flexible compute option: you control the OS and everything on it, which is why it's the default starting point and the fallback when higher-level services don't fit.",
    ],
    how: [
      { term: "Instance type / size", text: "You pick a family and size that fixes the vCPU, memory, and network profile. Families are tuned for a purpose: general-purpose, compute-optimized (CPU-heavy), memory-optimized (caches/DBs), and GPU (ML)." },
      { term: "Machine image", text: "A VM boots from an image (a snapshot of an OS + preinstalled software). You start from a base image (e.g. Ubuntu) or bake your own so new instances come up identical and ready." },
      { term: "Pricing models", text: "On-demand (pay per second, no commitment), reserved/savings plans (commit 1-3 years for a big discount on steady workloads), and spot (huge discount for spare capacity that can be reclaimed - good for fault-tolerant batch work)." },
      { term: "Block storage", text: "VMs attach network block volumes for persistent disk that survives stop/start. You choose SSD vs HDD and provisioned IOPS for performance." },
      { term: "Autoscaling & immutability", text: "In production you rarely manage one VM; you run a group of identical VMs from an image behind a load balancer and add/remove them automatically with load. Treat them as disposable (replace, don't patch in place)." },
    ],
    aws: [
      { name: "EC2", desc: "Elastic Compute Cloud - the core VM service." },
      { name: "AMI", desc: "Amazon Machine Image - the boot image for instances." },
      { name: "EBS", desc: "Elastic Block Store - persistent disks for EC2." },
    ],
    azure: [
      { name: "Azure Virtual Machines", desc: "The core VM service." },
      { name: "Managed Disks", desc: "Persistent block storage for VMs." },
      { name: "VM Scale Sets", desc: "Groups of identical autoscaling VMs." },
    ],
  },
  {
    id: "serverless",
    name: "Serverless Functions",
    tagline: "Run code on events without managing any servers.",
    what: [
      "You upload a function; the cloud runs it in response to events (an HTTP request, a file upload, a queue message) and you pay only for the milliseconds it executes.",
      "Best for event-driven, spiky, or glue workloads where you don't want to manage or pay for idle servers.",
    ],
    how: [
      { term: "Event triggers", text: "A function runs when something happens: an API call, an object landing in storage, a message on a queue, or a schedule. The platform wires the event source to your code." },
      { term: "Scale to zero, scale out", text: "With no traffic you pay nothing and zero instances run. Under load the platform spins up many concurrent copies automatically - no capacity planning." },
      { term: "Cold starts", text: "The first call after idle has to initialize a runtime (a 'cold start' adds latency). Mitigate with smaller packages, provisioned/pre-warmed concurrency, or faster runtimes." },
      { term: "Statelessness & limits", text: "Functions are stateless and short-lived (a max run time and memory cap), so persistent state goes in a database/cache/object store, not in the function. Long jobs are split or moved to containers." },
      { term: "Cost model", text: "You're billed per invocation and per GB-second of execution, so cost tracks usage exactly - cheap when idle, but can exceed VMs at very high sustained volume." },
    ],
    aws: [
      { name: "Lambda", desc: "Run functions on events; pay per invocation + GB-second." },
      { name: "API Gateway", desc: "Turns HTTP requests into Lambda triggers." },
      { name: "EventBridge", desc: "Event bus / scheduler that triggers functions." },
    ],
    azure: [
      { name: "Azure Functions", desc: "Event-driven serverless compute." },
      { name: "API Management", desc: "Front door for HTTP-triggered functions." },
      { name: "Event Grid", desc: "Event routing that triggers functions." },
    ],
  },
  {
    id: "containers",
    name: "Containers & Orchestration",
    tagline: "Package apps once, run them anywhere, and orchestrate at scale.",
    what: [
      "A container bundles your app with its exact dependencies so it runs identically on any machine. Orchestrators run thousands of containers across a cluster, handling scheduling, scaling, and recovery.",
      "Best for microservices and portable workloads that need more control than serverless but less overhead than managing VMs by hand.",
    ],
    how: [
      { term: "Image & registry", text: "You build a container image (app + dependencies) and push it to a registry. Any host pulls that image and runs an identical container - no 'works on my machine'." },
      { term: "Orchestrator", text: "Kubernetes (or a managed equivalent) schedules containers onto nodes, restarts failed ones, scales replicas with load, and does rolling updates with zero downtime." },
      { term: "Service discovery & networking", text: "The orchestrator gives each service a stable name and load-balances across its replicas, so services find each other without hardcoded IPs." },
      { term: "Serverless containers", text: "For teams that don't want to manage cluster nodes, 'serverless container' platforms run containers on demand with no servers to patch - a middle ground between functions and full Kubernetes." },
    ],
    aws: [
      { name: "EKS", desc: "Managed Kubernetes." },
      { name: "ECS", desc: "AWS-native container orchestrator." },
      { name: "Fargate", desc: "Serverless containers (no nodes to manage)." },
      { name: "ECR", desc: "Container image registry." },
    ],
    azure: [
      { name: "AKS", desc: "Azure Kubernetes Service - managed Kubernetes." },
      { name: "Container Apps", desc: "Serverless containers with autoscaling." },
      { name: "ACR", desc: "Azure Container Registry." },
    ],
  },
  {
    id: "object_storage",
    name: "Object Storage",
    tagline: "Cheap, durable, near-infinite storage for files and blobs.",
    what: [
      "Stores any file (images, video, backups, data-lake files) as an object addressed by a key, with effectively unlimited capacity and very high durability.",
      "The default home for large binaries and static assets - never store those in a database.",
    ],
    how: [
      { term: "Buckets & keys", text: "Objects live in a bucket/container and are addressed by a key (a path-like string). Storage is flat - the 'folders' are just key prefixes." },
      { term: "Durability & replication", text: "Each object is automatically replicated across multiple machines (and optionally regions), giving very high durability (commonly quoted as 11 nines) so files effectively never get lost." },
      { term: "Storage tiers", text: "Hot tiers cost more per GB but are cheap to access; cold/archive tiers are far cheaper to store but slower and pricier to retrieve. Lifecycle rules move data to colder tiers automatically as it ages." },
      { term: "Access & integration", text: "Access over HTTP APIs with fine-grained permissions and pre-signed URLs for temporary direct uploads/downloads. Pairs naturally with a CDN for global delivery." },
    ],
    aws: [
      { name: "S3", desc: "Simple Storage Service - the industry-standard object store." },
      { name: "S3 Glacier", desc: "Low-cost archive tiers." },
    ],
    azure: [
      { name: "Blob Storage", desc: "Azure's object store with hot/cool/archive tiers." },
      { name: "Data Lake Storage", desc: "Blob storage tuned for analytics." },
    ],
  },
  {
    id: "databases",
    name: "Managed Databases",
    tagline: "Run SQL and NoSQL without operating the database yourself.",
    what: [
      "Managed database services handle backups, patching, replication, and failover for you, so you get a production database without being a DBA.",
      "Choose relational for structured, transactional data and NoSQL for scale, flexibility, or simple key access.",
    ],
    how: [
      { term: "Managed relational (RDBMS)", text: "Fully managed SQL databases (Postgres, MySQL, etc.) with automated backups, minor-version patching, and one-click read replicas. Best when you need joins and ACID transactions." },
      { term: "High availability", text: "A standby replica in another availability zone takes over automatically if the primary fails (synchronous replication), giving failover with little data loss." },
      { term: "Read scaling", text: "Add read replicas to spread read traffic; writes still go to the primary. For write scaling you shard or move to a horizontally-scalable NoSQL store." },
      { term: "Managed NoSQL", text: "Key-value/document stores that auto-partition and replicate, giving single-digit-millisecond latency at huge scale with no servers to manage - at the cost of joins and strong consistency by default." },
    ],
    aws: [
      { name: "RDS / Aurora", desc: "Managed relational (Postgres/MySQL); Aurora is the cloud-native, scalable version." },
      { name: "DynamoDB", desc: "Serverless key-value/document NoSQL at any scale." },
    ],
    azure: [
      { name: "Azure SQL / DB for PostgreSQL", desc: "Managed relational databases." },
      { name: "Cosmos DB", desc: "Globally distributed multi-model NoSQL." },
    ],
  },
  {
    id: "networking",
    name: "Virtual Networks",
    tagline: "Your own private, isolated network in the cloud.",
    what: [
      "A virtual network is a logically isolated section of the cloud where you place your resources and control all traffic in and out.",
      "It's the security and connectivity foundation: almost everything runs inside one.",
    ],
    how: [
      { term: "VPC / VNet", text: "A private IP address space (a CIDR block like 10.0.0.0/16) that you own. Resources inside it can talk privately; nothing reaches them from the internet unless you allow it." },
      { term: "Subnets", text: "You slice the network into subnets, typically public (has a route to the internet, for load balancers) and private (no direct internet, for app servers and databases)." },
      { term: "Security groups / firewalls", text: "Stateful, instance-level firewalls that allow specific ports from specific sources (e.g. allow 443 from anywhere, 5432 only from the app subnet). Default-deny everything else." },
      { term: "Gateways", text: "An internet gateway lets public subnets reach the internet; a NAT gateway lets private subnets make outbound calls without being reachable inbound." },
      { term: "Private & hybrid connectivity", text: "Private endpoints keep traffic to managed services off the public internet; VPN or dedicated links connect the cloud network to your on-prem datacenter." },
    ],
    aws: [
      { name: "VPC", desc: "Virtual Private Cloud - the isolated network." },
      { name: "Security Groups / NACLs", desc: "Instance- and subnet-level firewalls." },
      { name: "Internet / NAT Gateway", desc: "Inbound and outbound internet access." },
    ],
    azure: [
      { name: "Virtual Network (VNet)", desc: "The isolated network." },
      { name: "Network Security Groups", desc: "Firewall rules for subnets/NICs." },
      { name: "NAT Gateway / VPN Gateway", desc: "Outbound and hybrid connectivity." },
    ],
  },
  {
    id: "lb_scaling",
    name: "Load Balancing & Autoscaling",
    tagline: "Spread traffic across servers and add/remove them automatically.",
    what: [
      "A load balancer distributes incoming requests across many servers; autoscaling changes the number of servers based on demand.",
      "Together they give you high availability (survive a server dying) and elasticity (pay for only what the current load needs).",
    ],
    how: [
      { term: "Load balancer", text: "A single endpoint that fans requests out across healthy servers. Layer 7 balancers route by HTTP path/host; Layer 4 balancers route raw TCP for max throughput." },
      { term: "Health checks", text: "The balancer probes each server and stops sending traffic to ones that fail, so failures are invisible to users." },
      { term: "Autoscaling group", text: "A pool of identical servers (from one image) with a min/max size. A policy adds instances when a metric (CPU, request count) is high and removes them when it's low." },
      { term: "Scaling policies", text: "Target-tracking (keep CPU ~50%), step scaling (add N at thresholds), and scheduled scaling (scale up before a known peak). Combine with the load balancer's health checks to replace bad instances." },
    ],
    aws: [
      { name: "ALB / NLB", desc: "Application (L7) and Network (L4) load balancers." },
      { name: "Auto Scaling Groups", desc: "Self-scaling pools of EC2 instances." },
    ],
    azure: [
      { name: "Application Gateway / Load Balancer", desc: "L7 and L4 load balancing." },
      { name: "VM Scale Sets", desc: "Autoscaling VM pools." },
    ],
  },
  {
    id: "iam",
    name: "Identity & Access Management",
    tagline: "Control who and what can do which actions on which resources.",
    what: [
      "IAM is how you grant and restrict permissions across the cloud. Getting it right is the core of cloud security.",
      "Everything - users, services, even other resources - acts through an identity with explicitly granted permissions.",
    ],
    how: [
      { term: "Identities", text: "Users (people), groups (sets of users), and roles/service principals (identities that workloads assume). Apps should use roles, never hardcoded keys." },
      { term: "Policies", text: "JSON documents that allow or deny specific actions on specific resources, optionally with conditions. Permissions are attached to identities (and sometimes resources)." },
      { term: "Least privilege", text: "Grant only the permissions actually needed, nothing more. Start denied and add narrowly - this limits the blast radius if a credential leaks." },
      { term: "Roles over keys", text: "Instead of putting long-lived access keys in code, give the workload a role; the platform hands it short-lived, auto-rotating credentials. No secrets to leak." },
      { term: "MFA & federation", text: "Require multi-factor auth for humans, and federate with a corporate identity provider (SSO) so access is centrally managed and revoked." },
    ],
    aws: [
      { name: "IAM", desc: "Users, roles, and JSON policies." },
      { name: "IAM Roles", desc: "Short-lived credentials for workloads." },
      { name: "Organizations / SCPs", desc: "Account-wide guardrails." },
    ],
    azure: [
      { name: "Microsoft Entra ID", desc: "Identity provider (formerly Azure AD)." },
      { name: "RBAC", desc: "Role assignments on resource scopes." },
      { name: "Managed Identities", desc: "Keyless identities for workloads." },
    ],
  },
  {
    id: "cdn",
    name: "CDN & Edge",
    tagline: "Cache content close to users for low latency worldwide.",
    what: [
      "A CDN caches your static (and some dynamic) content on edge servers across the globe so users download from a nearby location.",
      "Use it for any global app serving images, video, CSS/JS, or downloads - it cuts latency and offloads your origin.",
    ],
    how: [
      { term: "Edge caching", text: "Content is replicated to hundreds of edge locations. A user's request is routed to the nearest edge; a cache hit is served instantly, a miss is fetched from the origin and then cached." },
      { term: "TTL & invalidation", text: "Each cached object has a time-to-live controlling freshness. To push an update before expiry you invalidate the object or use a versioned URL (e.g. app.v2.js)." },
      { term: "Origin offload & protection", text: "Because edges absorb most traffic, your origin sees far fewer requests, cutting bandwidth cost and load - and the CDN shields it from traffic spikes and DDoS." },
      { term: "Edge compute", text: "Small functions can run at the edge to rewrite requests, do auth, or personalize responses without a round-trip to the origin." },
    ],
    aws: [
      { name: "CloudFront", desc: "Global CDN integrated with S3/ALB." },
      { name: "Lambda@Edge / CloudFront Functions", desc: "Code at the edge." },
    ],
    azure: [
      { name: "Azure Front Door", desc: "Global CDN + L7 routing." },
      { name: "Azure CDN", desc: "Static content delivery network." },
    ],
  },
  {
    id: "messaging",
    name: "Messaging & Events",
    tagline: "Decouple services with queues and event streams.",
    what: [
      "Messaging lets services communicate asynchronously: a producer drops a message and a consumer handles it later, so the two never block each other.",
      "Use it to decouple services, smooth out spikes, and build event-driven systems.",
    ],
    how: [
      { term: "Queue (point-to-point)", text: "A producer enqueues a message; one consumer pulls and processes it, then acks so it's deleted. Failures redeliver the message. Great for work distribution." },
      { term: "Pub/sub (fan-out)", text: "A producer publishes to a topic and every subscriber gets a copy. Good for broadcasting an event to many independent consumers." },
      { term: "Event streaming", text: "An append-only log (like Kafka) retains events so multiple consumers can read at their own pace and replay history. Good for analytics and event sourcing at high throughput." },
      { term: "Delivery guarantees", text: "Most systems are at-least-once (so handlers must be idempotent); dead-letter queues capture messages that keep failing for inspection instead of blocking the queue." },
    ],
    aws: [
      { name: "SQS", desc: "Managed queue (point-to-point)." },
      { name: "SNS", desc: "Pub/sub topics for fan-out." },
      { name: "Kinesis / MSK", desc: "Event streaming (Kafka-style)." },
    ],
    azure: [
      { name: "Service Bus", desc: "Queues and pub/sub topics." },
      { name: "Event Grid", desc: "Event routing/fan-out." },
      { name: "Event Hubs", desc: "High-throughput event streaming." },
    ],
  },
  {
    id: "iac",
    name: "Infrastructure as Code",
    tagline: "Define your whole environment in version-controlled files.",
    what: [
      "IaC describes your cloud resources in code/config so environments are reproducible, reviewable, and automatable - no clicking around a console.",
      "It's how serious teams manage infrastructure: the same definition builds dev, staging, and prod identically.",
    ],
    how: [
      { term: "Declarative definitions", text: "You declare the desired end state (this network, these servers, this database) and the tool figures out the API calls to reach it - you don't write step-by-step scripts." },
      { term: "State & plans", text: "The tool tracks current state and shows a diff/plan of what it will create, change, or destroy before applying, so changes are predictable and reviewable in a pull request." },
      { term: "Modules & reuse", text: "Package common setups (a standard VPC, a service) into reusable modules with inputs, so teams compose infrastructure instead of copy-pasting." },
      { term: "Idempotency & drift", text: "Re-running with no changes does nothing; if someone edits a resource by hand, the next apply detects the drift and reconciles it back to code." },
    ],
    aws: [
      { name: "CloudFormation", desc: "AWS-native declarative templates." },
      { name: "CDK", desc: "Define infra in real programming languages." },
      { name: "Terraform", desc: "Cloud-agnostic IaC (works on AWS too)." },
    ],
    azure: [
      { name: "Bicep / ARM", desc: "Azure-native declarative IaC." },
      { name: "Terraform", desc: "Cloud-agnostic IaC (works on Azure too)." },
    ],
  },
  {
    id: "observability",
    name: "Observability",
    tagline: "Know what your system is doing with metrics, logs, and traces.",
    what: [
      "Observability is how you understand a running system's health and debug problems - essential once you're past a single server.",
      "It rests on three pillars: metrics, logs, and traces.",
    ],
    how: [
      { term: "Metrics", text: "Numeric time-series (CPU, request rate, error rate, latency) you chart and alert on. They tell you something is wrong and how the system behaves over time." },
      { term: "Logs", text: "Timestamped event records from your apps and services, aggregated centrally so you can search across all servers to find the detail behind an incident." },
      { term: "Traces", text: "A trace follows one request across all the services it touches, showing where time is spent - indispensable for debugging latency in microservices." },
      { term: "Alerting & dashboards", text: "Dashboards visualize the above; alerts fire when a metric crosses a threshold (e.g. error rate > 1%) so on-call engineers find out before users do." },
    ],
    aws: [
      { name: "CloudWatch", desc: "Metrics, logs, alarms, dashboards." },
      { name: "X-Ray", desc: "Distributed tracing." },
    ],
    azure: [
      { name: "Azure Monitor", desc: "Metrics, alerts, dashboards." },
      { name: "Application Insights", desc: "App telemetry and distributed tracing." },
    ],
  },
  {
    id: "regions",
    name: "Regions & Availability Zones",
    tagline: "The geography that makes the cloud reliable and fast.",
    what: [
      "Clouds are organized into regions and availability zones - understanding them is how you build for low latency and survive failures.",
      "Where you place resources directly affects availability, latency, and even legal compliance.",
    ],
    how: [
      { term: "Region", text: "A geographic area (e.g. US-East) containing multiple datacenters. You pick regions near your users for low latency and to meet data-residency laws." },
      { term: "Availability Zone (AZ)", text: "One or more isolated datacenters within a region with independent power and networking. Spreading instances across AZs means one datacenter failing doesn't take you down." },
      { term: "Multi-AZ vs multi-region", text: "Multi-AZ (the baseline) survives a datacenter outage cheaply with low latency. Multi-region adds resilience to a whole-region outage and serves global users, but adds cost and data-sync complexity." },
      { term: "Data residency & latency", text: "Data physically lives in the region you choose. Replicating across regions improves global read latency and disaster recovery but must respect where data is legally allowed to be." },
    ],
    aws: [
      { name: "Regions / AZs", desc: "Geographic regions, each with multiple AZs." },
      { name: "Route 53", desc: "Geo/latency-based DNS routing." },
    ],
    azure: [
      { name: "Regions / Availability Zones", desc: "Same geographic model." },
      { name: "Traffic Manager / Front Door", desc: "Global routing across regions." },
    ],
  },
  {
    id: "well_architected",
    name: "Reliability, Security & Cost",
    tagline: "The cross-cutting principles of good cloud engineering.",
    what: [
      "Beyond individual services, both clouds publish 'well-architected' guidance: the principles that separate a hobby setup from a production one.",
      "These pillars - reliability, security, performance, cost, and operations - should shape every design.",
    ],
    how: [
      { term: "Reliability", text: "Assume things fail. Build redundancy at every tier, spread across AZs, automate failover and backups, and test recovery so an outage is a non-event." },
      { term: "Security", text: "Least-privilege IAM, encrypt data in transit (TLS) and at rest, keep resources in private subnets, and store secrets in a managed secrets store - never in code." },
      { term: "Cost optimization", text: "Right-size resources, use reserved/savings plans for steady load and spot for batch, scale to zero where possible, set budgets and alerts, and delete idle resources." },
      { term: "Operational excellence", text: "Everything as code (IaC + CI/CD), monitor and alert on what matters, and run blameless post-mortems so the system and team keep improving." },
    ],
    aws: [
      { name: "Well-Architected Framework", desc: "AWS's 6-pillar guidance + review tool." },
      { name: "Cost Explorer / Budgets", desc: "Cost visibility and alerts." },
    ],
    azure: [
      { name: "Well-Architected Framework", desc: "Azure's equivalent pillar guidance." },
      { name: "Cost Management", desc: "Cost analysis and budgets." },
    ],
  },
];
