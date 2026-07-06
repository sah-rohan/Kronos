// Networking reference, structured on the standard Network+ / top-down
// curriculum: how data moves, addressing, core protocols, routing, then cloud
// networking (VPC, subnets, security groups), delivery, and troubleshooting.
// Written so a reader needs zero prior networking knowledge.
import type { SDHow } from "./components";
import type { CloudService } from "./cloud";

export type NetworkingDoc = {
  id: string;
  name: string;
  tagline: string;
  what: string[];
  how: SDHow[];
  // Where you meet this in real cloud work (AWS/Azure names included inline).
  cloud: CloudService[];
};

export const NETWORKING_DOCS: NetworkingDoc[] = [
  {
    id: "internet-basics",
    name: "How the Internet Works",
    tagline: "Packets, addresses, and hops - the mental model everything else builds on.",
    what: [
      "The internet moves data by chopping it into small pieces called packets. Each packet carries a destination address and travels independently across many networks until it arrives, where the pieces are reassembled.",
      "Every device that participates has an IP address (its number on the network). Routers are the machines in the middle that read each packet's destination and forward it one step ('hop') closer.",
    ],
    how: [
      { term: "Packet", text: "A small chunk of data plus headers (metadata like source and destination address). Big files become thousands of packets; losing one means resending just that one, not the whole file." },
      { term: "IP address", text: "A device's number on the network, like 172.16.5.4. Packets are delivered to IP addresses the way mail is delivered to street addresses." },
      { term: "Router & hop", text: "A router connects networks and forwards packets toward their destination. Each router-to-router step is a hop; a packet typically takes 10-20 hops to cross the internet." },
      { term: "Layers", text: "Networking is built in layers, each solving one job on top of the one below: physical wires carry bits → IP delivers packets between machines → TCP makes delivery reliable → HTTP speaks the application's language. The layer stack is the map for everything in this module." },
      { term: "Client & server", text: "The machine asking (your browser) is the client; the machine answering (the web server) is the server. Most networking is arranging a reliable conversation between the two." },
    ],
    cloud: [
      { name: "Everything below", desc: "Every cloud networking service is one of these ideas productized: addresses, routing, or moving packets." },
    ],
  },
  {
    id: "osi-model",
    name: "The OSI & TCP/IP Models",
    tagline: "The layer map: what happens at layer 4 vs layer 7 and why people talk that way.",
    what: [
      "The OSI model names seven layers of networking so engineers can say precisely where something happens. In practice, five matter daily; you'll constantly hear 'layer 4' (transport) and 'layer 7' (application).",
      "The TCP/IP model is the simplified four-layer version the real internet is built on. Same idea, fewer names.",
    ],
    how: [
      { term: "L1 Physical / L2 Data Link", text: "The wire (or radio) and the local network segment. Ethernet and Wi-Fi live here, moving 'frames' between devices on the same network using MAC addresses (the hardware ID burned into a network card)." },
      { term: "L3 Network (IP)", text: "Delivers packets between machines across networks using IP addresses. Routers work at this layer. When people say 'routing', they mean layer 3." },
      { term: "L4 Transport (TCP/UDP)", text: "Delivers data between programs (not just machines) using ports, and optionally adds reliability. A 'layer 4 load balancer' forwards raw TCP/UDP connections without understanding what's inside." },
      { term: "L7 Application (HTTP, DNS...)", text: "The protocols apps actually speak. A 'layer 7 load balancer' understands HTTP, so it can route by URL path, host, or headers." },
      { term: "Why layers matter", text: "Each layer only relies on the one below, so parts are swappable: HTTP doesn't care if you're on Wi-Fi or fiber. When debugging, you walk the layers: is the cable up → can I ping the IP → is the port open → is the app answering?" },
    ],
    cloud: [
      { name: "NLB vs ALB (AWS)", desc: "Network Load Balancer is L4; Application Load Balancer is L7 - the layer model in product form." },
      { name: "Azure LB vs App Gateway", desc: "Azure Load Balancer is L4; Application Gateway is L7." },
    ],
  },
  {
    id: "ip-addressing",
    name: "IP Addressing & Subnetting (CIDR)",
    tagline: "How addresses are structured and carved into networks - the math behind every VPC.",
    what: [
      "An IPv4 address is 32 bits shown as four numbers (10.0.1.25). The first part identifies the network, the rest identifies the host within it. Subnetting is deciding where that split is.",
      "CIDR notation like 10.0.0.0/16 says 'the first 16 bits are the network'. A /16 has 65,536 addresses; each extra bit halves it - a /24 has 256. Every VPC and subnet you ever create is defined this way.",
    ],
    how: [
      { term: "CIDR block", text: "Network address + prefix length: 10.0.0.0/24 means addresses 10.0.0.0 through 10.0.0.255. Smaller prefix number = bigger network. /16 → 65,536 addresses, /24 → 256, /28 → 16." },
      { term: "Private ranges", text: "Three ranges are reserved for private networks and never routed on the public internet: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Home networks and VPCs use these; that's why every office Wi-Fi hands out 192.168.x.x." },
      { term: "Subnetting", text: "Splitting one block into smaller ones: a 10.0.0.0/16 VPC might be cut into /24 subnets (10.0.1.0/24, 10.0.2.0/24...) so different tiers or availability zones each get their own network with its own rules." },
      { term: "Public vs private IP", text: "A public IP is reachable from the internet; a private IP only inside its network. A server usually has a private IP, and gets traffic from the internet via a load balancer or NAT holding the public one." },
      { term: "IPv6", text: "The 128-bit successor (2600:1f18::...) that exists because IPv4's ~4.3 billion addresses ran out. Same concepts, vastly more addresses, no NAT needed." },
    ],
    cloud: [
      { name: "VPC CIDR (AWS/Azure)", desc: "You literally type a CIDR block (e.g. 10.0.0.0/16) when creating a VPC/VNet, then carve subnets from it." },
      { name: "Elastic IP / Public IP", desc: "A public IPv4 address you rent and attach to resources." },
    ],
  },
  {
    id: "dhcp-arp",
    name: "Joining a Network (DHCP & ARP)",
    tagline: "How a device gets an address and finds its neighbors - automatically.",
    what: [
      "When a laptop joins Wi-Fi it doesn't know its IP, the router's address, or the DNS server. DHCP hands it all of that automatically in about a second.",
      "ARP solves the other bootstrap problem: translating an IP address into the hardware (MAC) address needed to actually deliver on the local network.",
    ],
    how: [
      { term: "DHCP", text: "Dynamic Host Configuration Protocol. The joining device broadcasts 'anyone, give me an address'; the DHCP server offers one from its pool plus the gateway and DNS addresses, leased for a period and renewed automatically." },
      { term: "Lease", text: "A DHCP address is borrowed, not owned. Servers that must keep a fixed address get a static IP or a DHCP reservation instead." },
      { term: "ARP", text: "Address Resolution Protocol. To send to 10.0.1.7 on the local network, a device shouts 'who has 10.0.1.7?' and the owner replies with its MAC address. Results are cached briefly." },
      { term: "Default gateway", text: "The router's local address (handed out by DHCP). Anything destined outside the local subnet is sent to the gateway, which forwards it onward - it's the network's door." },
    ],
    cloud: [
      { name: "VPC DHCP options", desc: "Cloud instances get their private IPs via the platform's built-in DHCP - it's why an EC2 VM boots already networked." },
    ],
  },
  {
    id: "dns",
    name: "DNS",
    tagline: "The internet's phone book: names to addresses, with caching everywhere.",
    what: [
      "Humans use names (usekronos.tech); packets need IPs. DNS is the global, distributed database that resolves one to the other, consulted before almost every connection.",
      "It's also a traffic-steering tool: by answering different IPs you get load distribution, failover, and 'nearest region' routing.",
    ],
    how: [
      { term: "Resolution chain", text: "Your resolver asks the root servers ('who handles .tech?') → the TLD servers ('who handles usekronos.tech?') → that domain's authoritative server, which returns the IP. Each answer is cached so repeats are instant." },
      { term: "Record types", text: "A = name→IPv4, AAAA = name→IPv6, CNAME = name→another name (alias), MX = mail server, TXT = free text (used for domain verification), NS = which servers are authoritative." },
      { term: "TTL", text: "Time-to-live: how long answers may be cached. Low TTL (60s) means changes propagate fast; high TTL means fewer lookups. Before a migration you lower TTL in advance." },
      { term: "DNS-based routing", text: "Managed DNS can answer based on health checks (failover), latency (nearest region), or weights (canary a new version to 5% of traffic)." },
    ],
    cloud: [
      { name: "Route 53 (AWS)", desc: "Managed DNS with health checks and routing policies." },
      { name: "Azure DNS / Traffic Manager", desc: "DNS hosting, plus DNS-level global traffic routing." },
    ],
  },
  {
    id: "tcp-udp",
    name: "TCP vs UDP (Transport)",
    tagline: "Reliable-but-heavier vs fast-but-lossy - and ports, the apartment numbers.",
    what: [
      "IP delivers packets machine-to-machine with no guarantees: packets can be lost, duplicated, or arrive out of order. The transport layer fixes (or accepts) that, and addresses the right program via ports.",
      "TCP guarantees complete, in-order delivery. UDP just sends and hopes. Nearly everything is a deliberate choice between them.",
    ],
    how: [
      { term: "Port", text: "A number (0-65535) identifying which program on a machine should get the data. Web is 443 (HTTPS) / 80 (HTTP), SSH is 22, Postgres is 5432. IP gets you to the building; the port is the apartment." },
      { term: "TCP handshake", text: "Three packets (SYN → SYN-ACK → ACK) establish a connection before any data. Both sides then track sequence numbers, acknowledge receipt, and retransmit anything lost - that's the reliability." },
      { term: "Flow & congestion control", text: "TCP speeds up until the network shows loss, then backs off - so it shares bandwidth fairly and doesn't melt routers. It's why a download starts slow and ramps." },
      { term: "UDP", text: "No handshake, no retransmit, no ordering - just labeled packets. Perfect when stale data is worthless (live video, game state, voice) or when the app handles reliability itself." },
      { term: "QUIC / HTTP/3", text: "A modern transport built on UDP that re-adds reliability and encryption but with faster setup and better behavior on flaky networks - it's what HTTP/3 runs on." },
    ],
    cloud: [
      { name: "Security group rules", desc: "Written as protocol + port: 'allow TCP 443 from anywhere' is the TCP/port model in one line." },
      { name: "NLB (AWS)", desc: "Load-balances raw TCP/UDP flows at layer 4." },
    ],
  },
  {
    id: "tls-https",
    name: "TLS & HTTPS",
    tagline: "How connections are encrypted and how servers prove who they are.",
    what: [
      "TLS wraps a connection in encryption so nobody in the middle can read or tamper with it. HTTPS is just HTTP inside TLS.",
      "It solves two problems at once: privacy (encryption) and identity (certificates prove you're talking to the real site, not an imposter).",
    ],
    how: [
      { term: "TLS handshake", text: "Client and server agree on ciphers, the server presents its certificate, and the two derive a shared session key using public-key cryptography. Everything after is encrypted with that key." },
      { term: "Certificate", text: "A file binding a domain name to a public key, signed by a Certificate Authority (CA) the browser already trusts. The padlock means 'a trusted CA vouches this server owns this domain'." },
      { term: "CA chain", text: "Trust is a chain: your cert is signed by an intermediate, signed by a root shipped with the OS/browser. Expired or mismatched chains are the classic 'certificate error'." },
      { term: "TLS termination", text: "Where TLS is decrypted. Usually at the load balancer/CDN edge, so certificates live in one managed place; traffic can be re-encrypted to backends for zero-trust setups." },
      { term: "mTLS", text: "Mutual TLS: BOTH sides present certificates. Used service-to-service so each microservice proves its identity - the backbone of service-mesh security." },
    ],
    cloud: [
      { name: "ACM (AWS)", desc: "Free auto-renewing certificates attached to load balancers and CloudFront." },
      { name: "Azure Key Vault / App Gateway", desc: "Certificate storage and TLS termination at the gateway." },
    ],
  },
  {
    id: "routing",
    name: "Routing & Route Tables",
    tagline: "How packets pick their path - from your subnet's route table to internet BGP.",
    what: [
      "Every device and router holds a route table: a list of 'to reach this network, send traffic here'. Routing is just looking up the destination and picking the most specific match.",
      "Inside a VPC you edit route tables directly; between internet providers the same idea runs at planet scale via BGP.",
    ],
    how: [
      { term: "Route table", text: "Rows of destination CIDR → target. E.g. '10.0.0.0/16 → local' (stay in the VPC) and '0.0.0.0/0 → internet gateway' (everything else goes to the internet)." },
      { term: "Longest-prefix match", text: "When multiple rows match, the most specific wins: 10.0.1.0/24 beats 10.0.0.0/16 beats 0.0.0.0/0. That's the entire routing decision." },
      { term: "Default route", text: "0.0.0.0/0 matches everything - the 'if nothing else matched' row. A subnet with no default route to an internet gateway simply cannot reach the internet (that's what makes a subnet private)." },
      { term: "BGP", text: "Border Gateway Protocol: how the internet's big networks advertise 'I can reach these prefixes' to each other. It's trust-based and slow to converge - big internet outages are often a bad BGP advertisement." },
      { term: "Anycast", text: "Advertising the same IP from many locations; BGP routes each user to the nearest one. It's how CDNs and public DNS (1.1.1.1, 8.8.8.8) are fast everywhere." },
    ],
    cloud: [
      { name: "VPC route tables (AWS/Azure)", desc: "Per-subnet route tables you edit - the primary tool for shaping VPC traffic." },
      { name: "Transit Gateway / Virtual WAN", desc: "A managed hub routing traffic between many VPCs/VNets and on-prem." },
    ],
  },
  {
    id: "nat",
    name: "NAT (Network Address Translation)",
    tagline: "How private machines reach the internet without being reachable themselves.",
    what: [
      "Private IPs can't be routed on the internet. NAT rewrites packets from private machines so they appear to come from one shared public IP, and routes the replies back to the right machine.",
      "It also acts as a one-way valve: inside can call out, outside can't call in - which is exactly what you want for private servers fetching updates.",
    ],
    how: [
      { term: "How it works", text: "The NAT device swaps the packet's private source (10.0.2.5:44321) for its public IP and a tracked port, remembers the mapping, and un-swaps the reply. Thousands of machines can share one public IP." },
      { term: "One-way by design", text: "Connections must start from inside (creating the mapping). Unsolicited inbound traffic has no mapping and is dropped - private instances stay unreachable while still able to download packages." },
      { term: "Home vs cloud", text: "Your home router NATs your whole house behind one ISP address. In a VPC, a NAT gateway does the same for private subnets." },
      { term: "The IPv4 crutch", text: "NAT exists because IPv4 addresses ran out. IPv6 has enough addresses that every machine can have a public one, with firewalls (not NAT) providing the protection." },
    ],
    cloud: [
      { name: "NAT Gateway (AWS)", desc: "Managed NAT for private subnets - outbound internet, no inbound exposure. Per-hour + per-GB billing." },
      { name: "Azure NAT Gateway", desc: "Same job for VNets." },
    ],
  },
  {
    id: "vpc",
    name: "VPC (Virtual Private Cloud)",
    tagline: "Your own private, isolated network inside the cloud - the container for everything.",
    what: [
      "A VPC is a software-defined private network you carve out of the cloud: you pick its CIDR range, split it into subnets, and set the rules for what can talk to what. Nothing inside is reachable from the internet unless you explicitly open a door.",
      "It's the first thing created in any real deployment - every VM, database, and container lands inside a VPC, and its layout IS your security architecture.",
    ],
    how: [
      { term: "Address space", text: "You choose a private CIDR (e.g. 10.0.0.0/16 = 65k addresses). Pick non-overlapping ranges across VPCs/offices up front - overlapping ranges can never be connected later without pain." },
      { term: "Isolation by default", text: "A fresh VPC has no internet path in or out. Connectivity is opt-in: you add gateways, routes, and security rules deliberately - the opposite of 'open by default'." },
      { term: "Availability zones", text: "Subnets live in specific AZs (physically separate data centers). Spreading subnets across AZs is how a VPC survives a data-center failure." },
      { term: "Endpoints", text: "Private connections to cloud services (S3, storage) so that traffic never crosses the public internet - lower risk, often lower cost." },
      { term: "The standard blueprint", text: "Public subnets hold only the entry points (load balancer, NAT); private subnets hold apps; isolated subnets hold databases. Traffic flows internet → LB → app → DB, and never skips a tier." },
    ],
    cloud: [
      { name: "Amazon VPC", desc: "The AWS implementation - subnets, route tables, IGW/NAT, endpoints." },
      { name: "Azure VNet", desc: "The Azure equivalent - same concepts, different names." },
    ],
  },
  {
    id: "subnets-gateways",
    name: "Public & Private Subnets, IGW",
    tagline: "What actually makes a subnet 'public' - and the standard 3-tier layout.",
    what: [
      "A subnet is a slice of the VPC's address range living in one availability zone. 'Public' and 'private' aren't checkboxes - they're consequences of routing.",
      "A subnet is public if its route table has a route to an internet gateway. No such route = private. That one row of routing is the whole distinction.",
    ],
    how: [
      { term: "Internet Gateway (IGW)", text: "The VPC's door to the internet. Attached to the VPC; subnets whose route table points 0.0.0.0/0 at it are public. Instances still each need a public IP to be individually reachable." },
      { term: "Public subnet", text: "Hosts things that MUST face the internet: load balancers, NAT gateways, bastion hosts. Rule of thumb: almost nothing else belongs here." },
      { term: "Private subnet", text: "No IGW route. Instances have only private IPs, unreachable from outside; they reach out via the NAT gateway. Your app servers live here." },
      { term: "Isolated subnet", text: "No IGW and no NAT - can't reach the internet at all. Databases go here: they only ever talk to the app tier, and cloud-service access uses private endpoints." },
      { term: "Multi-AZ pattern", text: "Create the same tiers in 2-3 AZs (public-a/b, private-a/b, isolated-a/b) so the load balancer and app fleet survive an AZ outage." },
    ],
    cloud: [
      { name: "IGW + route tables (AWS)", desc: "The exact mechanics above." },
      { name: "Azure VNet subnets", desc: "Azure VNets: similar tiers; internet egress is controlled with NAT Gateway and NSGs." },
    ],
  },
  {
    id: "security-groups",
    name: "Security Groups & NACLs",
    tagline: "The cloud's firewalls: per-resource, stateful, and the #1 misconfiguration source.",
    what: [
      "A security group is a firewall attached to a resource (VM, database, load balancer) listing exactly what traffic may reach it - 'allow TCP 443 from anywhere', 'allow 5432 only from the app tier'. Everything not allowed is denied.",
      "Network ACLs are a second, blunter firewall at the subnet boundary. Security groups do the fine-grained work; NACLs are the coarse backstop.",
    ],
    how: [
      { term: "Stateful", text: "Security groups track connections: if an inbound request is allowed, its reply is automatically allowed back out. You only write rules for the direction that initiates." },
      { term: "Rules", text: "Each rule = protocol + port + source. The source can be an IP range OR another security group - 'allow 5432 from sg-app' means 'only members of the app group can reach the DB', which stays correct as servers scale." },
      { term: "Chaining groups", text: "The standard pattern: sg-lb allows 443 from the internet; sg-app allows 8080 only from sg-lb; sg-db allows 5432 only from sg-app. Each tier can only be reached by the tier before it." },
      { term: "NACLs", text: "Subnet-level, stateless (you must allow BOTH directions), support explicit deny, evaluated by rule number. Used sparingly - e.g. block a hostile IP range from an entire subnet." },
      { term: "Classic mistakes", text: "Opening SSH (22) or a database port to 0.0.0.0/0 is the most common real-world breach cause. Audit for 'from anywhere' rules; only 80/443 on public entry points should ever have them." },
    ],
    cloud: [
      { name: "Security Groups / NACLs (AWS)", desc: "Exactly as described." },
      { name: "NSGs (Azure)", desc: "Network Security Groups attach to subnets or NICs and combine both roles, with priorities and explicit deny." },
    ],
  },
  {
    id: "load-balancing-net",
    name: "Load Balancing (L4 vs L7)",
    tagline: "One address in front of many servers - and what the layer choice changes.",
    what: [
      "A load balancer gives clients one stable address and spreads their traffic across many interchangeable servers, health-checking each and skipping the dead ones.",
      "The big design choice is the layer: L4 balances raw connections (fast, protocol-blind); L7 understands HTTP (smart routing, but it terminates and re-makes the request).",
    ],
    how: [
      { term: "L4 (transport)", text: "Forwards TCP/UDP flows by IP+port without reading contents. Extremely fast, handles any protocol, preserves the raw stream - use for databases, game servers, raw TCP, extreme throughput." },
      { term: "L7 (application)", text: "Parses HTTP: can route /api to one fleet and /static to another, read headers/cookies, do sticky sessions, and terminate TLS. The default for web apps." },
      { term: "Health checks", text: "The LB probes each target (e.g. GET /health every 10s); failures pull the target out of rotation, so a dying server stops receiving users within seconds - this is where 'self-healing' starts." },
      { term: "Algorithms", text: "Round-robin (take turns), least-connections (send to the least busy), IP-hash (same client → same server). Least-connections is the usual default for uneven workloads." },
      { term: "Cross-AZ + autoscaling", text: "The LB spreads across AZs and pairs with an autoscaling group: scale-out adds targets, scale-in drains connections first. Together they're the standard high-availability unit." },
    ],
    cloud: [
      { name: "ALB / NLB (AWS)", desc: "Application (L7) and Network (L4) load balancers." },
      { name: "App Gateway / Azure LB", desc: "The Azure L7 and L4 equivalents; Front Door adds global L7." },
    ],
  },
  {
    id: "vpn-peering",
    name: "VPN, Peering & Private Links",
    tagline: "Connecting networks privately: office↔cloud, VPC↔VPC, and you↔production.",
    what: [
      "Real systems span networks: your laptop, the office, multiple VPCs, maybe a data center. These tools connect them without sending private traffic over the open internet unprotected.",
      "The menu: VPN (encrypted tunnel over the internet), peering (direct private route between VPCs), dedicated circuits (a physical line), and private endpoints (expose one service, not a network).",
    ],
    how: [
      { term: "Site-to-site VPN", text: "An encrypted IPsec tunnel between two routers (office ↔ VPC). Traffic crosses the public internet but unreadable. Cheap and quick; latency and bandwidth are at the internet's mercy." },
      { term: "Client VPN", text: "The same idea for one person: your laptop joins the private network to reach internal tools. The modern zero-trust alternative (Tailscale-style meshes or identity-aware proxies) grants per-service access instead of whole-network access." },
      { term: "VPC peering", text: "A private route between two VPCs so they talk over the cloud's backbone - no internet, no VPN overhead. Requires non-overlapping CIDRs and isn't transitive (A↔B and B↔C doesn't give A↔C)." },
      { term: "Hub-and-spoke", text: "With many VPCs, pairwise peering explodes; a transit hub (Transit Gateway / Virtual WAN) connects all of them through one router with central route control." },
      { term: "Dedicated circuit", text: "A physical private line into the cloud (Direct Connect / ExpressRoute) for steady low latency and big bandwidth - what enterprises use for serious on-prem↔cloud traffic." },
      { term: "PrivateLink / Private Endpoint", text: "Exposes ONE service into another network as a private IP, instead of connecting whole networks. How SaaS vendors reach customer VPCs without any network merge." },
    ],
    cloud: [
      { name: "VPC Peering / Transit Gateway / Direct Connect (AWS)", desc: "The AWS lineup, per pattern above." },
      { name: "VNet Peering / Virtual WAN / ExpressRoute (Azure)", desc: "The Azure equivalents." },
    ],
  },
  {
    id: "cdn-edge-net",
    name: "CDN & Edge Networking",
    tagline: "Serving from 300 cities instead of one region - caching, anycast, and edge TLS.",
    what: [
      "A CDN is a network of servers near users ('edge locations') that cache your content and answer on your behalf. Users hit the nearest edge instead of crossing the planet to your origin.",
      "It's networking, not just caching: anycast routing, TLS at the edge, and absorbing attack traffic before it ever reaches you.",
    ],
    how: [
      { term: "Edge & origin", text: "Your real servers are the origin; the CDN's global points-of-presence are edges. A cache hit is served in ~20ms locally; a miss is fetched from the origin once, then reused for everyone nearby." },
      { term: "Anycast routing", text: "Every edge advertises the same IP; BGP delivers each user to the closest one automatically. No 'pick your region' - the network itself does it." },
      { term: "Cache control", text: "HTTP headers (Cache-Control, max-age) plus invalidation APIs decide how long edges keep content. Static assets get long TTLs with hashed filenames; HTML gets short ones (your stale-index.html bug was exactly this)." },
      { term: "TLS & DDoS at the edge", text: "Certificates live at the edge, so handshakes are fast everywhere - and volumetric attacks hit the CDN's massive capacity instead of your origin. WAF rules (block bad patterns) run there too." },
      { term: "Edge compute", text: "Small functions run at edges (rewrite headers, auth checks, A/B routing) before requests reach the origin - CloudFront Functions/Workers-style." },
    ],
    cloud: [
      { name: "CloudFront (AWS)", desc: "The CDN in front of S3/ALB origins - this app's frontend is served through it." },
      { name: "Azure Front Door / CDN", desc: "Azure's global edge with routing, WAF, and caching." },
    ],
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting & Tools",
    tagline: "ping, traceroute, dig, curl, flow logs - the debugging ladder for 'it's not working'.",
    what: [
      "Network debugging is walking the layers with one small tool per layer, bottom-up: is the host reachable → does the name resolve → is the port open → does the app answer.",
      "Knowing five commands turns 'the site is down??' into a located, explainable failure in minutes.",
    ],
    how: [
      { term: "ping", text: "Sends echo packets to an IP: answers = the host is reachable, and shows latency and loss. No answer proves less than you'd think (many hosts drop ping) - but a reply with 2% loss explains a lot." },
      { term: "traceroute", text: "Shows every router hop to a destination with per-hop latency, so you can see WHERE traffic dies or slows: your network, the ISP, or the far end." },
      { term: "dig / nslookup", text: "Queries DNS directly: what does this name resolve to, from which server, with what TTL. First tool out when 'it works on my machine' - half the time it's stale DNS." },
      { term: "curl -v", text: "Makes an HTTP(S) request showing the full conversation: connect, TLS handshake, certificate, headers, status. Pinpoints whether the failure is connection, certificate, or the app itself." },
      { term: "netstat / ss & nc", text: "'What's listening on this machine, and can I reach that port?' - ss -tlnp lists listeners; nc -zv host 5432 tests one port. The classic 'app up but security group closed' detector." },
      { term: "Flow logs", text: "The cloud's packet accounting: every accepted/rejected connection in a VPC, with source, destination, and port. REJECT lines are how you catch a wrong security group in minutes instead of hours." },
    ],
    cloud: [
      { name: "VPC Flow Logs (AWS)", desc: "Connection logs to CloudWatch/S3; Reachability Analyzer traces a path and names the blocking rule." },
      { name: "Azure Network Watcher", desc: "Flow logs, connection troubleshoot, and packet capture." },
    ],
  },
];
