import { useState } from "react";
import {
  ArrowRight,
  Crown,
  Flame,
  Calendar,
  TrendingUp,
  RefreshCw,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const members = [
  { name: "Jordan Dev", initials: "JD", solved: 87, streak: 13, last: "2h ago", color: "bg-[#111] text-white" },
  { name: "Mira Chen", initials: "MC", solved: 74, streak: 9, last: "5h ago", color: "bg-coral text-white" },
  { name: "Ari Patel", initials: "AP", solved: 62, streak: 4, last: "1d ago", color: "bg-sky text-sky-foreground" },
  { name: "Sam Ortega", initials: "SO", solved: 51, streak: 6, last: "3h ago", color: "bg-[#f5c26b] text-[#5a3a0a]" },
  { name: "Lena Park", initials: "LP", solved: 47, streak: 3, last: "6h ago", color: "bg-sky text-sky-foreground" },
  { name: "Ravi Shah", initials: "RS", solved: 44, streak: 5, last: "1d ago", color: "bg-coral text-white" },
  { name: "Tom Hale", initials: "TH", solved: 39, streak: 2, last: "2d ago", color: "bg-[#f5c26b] text-[#5a3a0a]" },
  { name: "Nina Bose", initials: "NB", solved: 33, streak: 7, last: "4h ago", color: "bg-[#111] text-white" },
  { name: "Omar Diaz", initials: "OD", solved: 28, streak: 1, last: "3d ago", color: "bg-sky text-sky-foreground" },
  { name: "Priya Nair", initials: "PN", solved: 25, streak: 4, last: "7h ago", color: "bg-coral text-white" },
  { name: "Marco Bianchi", initials: "MB", solved: 22, streak: 2, last: "1d ago", color: "bg-[#f5c26b] text-[#5a3a0a]" },
  { name: "Yuki Tanaka", initials: "YT", solved: 19, streak: 5, last: "2h ago", color: "bg-[#111] text-white" },
  { name: "Hana Kim", initials: "HK", solved: 15, streak: 1, last: "5d ago", color: "bg-sky text-sky-foreground" },
  { name: "Leo Costa", initials: "LC", solved: 11, streak: 3, last: "9h ago", color: "bg-coral text-white" },
];

const recent = [
  { n: 121, name: "Best Time to Buy Stock", diff: "Easy", who: ["JD", "MC", "AP", "SO", "LP"] },
  { n: 33, name: "Search in Rotated Array", diff: "Medium", who: ["AP", "JD", "SO", "RS"] },
  { n: 76, name: "Minimum Window Substring", diff: "Hard", who: ["MC"] },
  { n: 20, name: "Valid Parentheses", diff: "Easy", who: ["SO", "AP", "TH", "NB", "JD", "MC"] },
  { n: 207, name: "Course Schedule", diff: "Medium", who: ["JD", "MC", "AP"] },
  { n: 1, name: "Two Sum", diff: "Easy", who: ["LP", "RS"] },
  { n: 200, name: "Number of Islands", diff: "Medium", who: ["TH", "JD"] },
  { n: 42, name: "Trapping Rain Water", diff: "Hard", who: ["MC", "AP"] },
  { n: 226, name: "Invert Binary Tree", diff: "Easy", who: ["NB", "SO", "OD"] },
  { n: 153, name: "Find Minimum in Rotated Array", diff: "Medium", who: ["RS"] },
  { n: 23, name: "Merge K Sorted Lists", diff: "Hard", who: ["JD", "MC"] },
  { n: 70, name: "Climbing Stairs", diff: "Easy", who: ["OD", "LP", "TH"] },
  { n: 322, name: "Coin Change", diff: "Medium", who: ["AP", "NB"] },
  { n: 295, name: "Find Median from Data Stream", diff: "Hard", who: ["MC"] },
  { n: 217, name: "Contains Duplicate", diff: "Easy", who: ["PN", "MB"] },
  { n: 853, name: "Car Fleet", diff: "Medium", who: ["YT", "JD"] },
  { n: 84, name: "Largest Rectangle in Histogram", diff: "Hard", who: ["HK"] },
  { n: 125, name: "Valid Palindrome", diff: "Easy", who: ["LC", "PN", "RS"] },
  { n: 15, name: "3Sum", diff: "Medium", who: ["MB", "AP"] },
  { n: 297, name: "Serialize and Deserialize Tree", diff: "Hard", who: ["JD", "YT"] },
  { n: 704, name: "Binary Search", diff: "Easy", who: ["HK", "LC"] },
  { n: 11, name: "Container With Most Water", diff: "Medium", who: ["SO", "NB"] },
];

type Diff = "Easy" | "Medium" | "Hard";
type Problem = { name: string; diff: Diff; done: boolean; optimal: boolean };

// Build the NeetCode 150 grouped by its roadmap categories.
// Compact encoding per row: "Name|E|M|H". done/optimal are filled in below.
const DMAP = { E: "Easy", M: "Medium", H: "Hard" } as const;
function cat(title: string, rows: string): { title: string; items: Problem[] } {
  const items = rows
    .trim()
    .split("\n")
    .map((line) => {
      const [name, d] = line.split("|");
      return {
        name: name.trim(),
        diff: DMAP[d.trim() as "E" | "M" | "H"],
        done: false,
        optimal: false,
      };
    });
  return { title, items };
}

const categories = [
  cat(
    "Arrays & Hashing",
    `Contains Duplicate|E
Valid Anagram|E
Two Sum|E
Group Anagrams|M
Top K Frequent Elements|M
Encode and Decode Strings|M
Product of Array Except Self|M
Valid Sudoku|M
Longest Consecutive Sequence|M`
  ),
  cat(
    "Two Pointers",
    `Valid Palindrome|E
Two Sum II|M
3Sum|M
Container With Most Water|M
Trapping Rain Water|H`
  ),
  cat(
    "Sliding Window",
    `Best Time to Buy and Sell Stock|E
Longest Substring Without Repeating|M
Longest Repeating Character Replacement|M
Permutation in String|M
Minimum Window Substring|H
Sliding Window Maximum|H`
  ),
  cat(
    "Stack",
    `Valid Parentheses|E
Min Stack|M
Evaluate Reverse Polish Notation|M
Generate Parentheses|M
Daily Temperatures|M
Car Fleet|M
Largest Rectangle in Histogram|H`
  ),
  cat(
    "Binary Search",
    `Binary Search|E
Search a 2D Matrix|M
Koko Eating Bananas|M
Find Minimum in Rotated Sorted Array|M
Search in Rotated Sorted Array|M
Time Based Key-Value Store|M
Median of Two Sorted Arrays|H`
  ),
  cat(
    "Linked List",
    `Reverse Linked List|E
Merge Two Sorted Lists|E
Reorder List|M
Remove Nth Node From End|M
Copy List with Random Pointer|M
Add Two Numbers|M
Linked List Cycle|E
Find the Duplicate Number|M
LRU Cache|M
Merge K Sorted Lists|H
Reverse Nodes in k-Group|H`
  ),
  cat(
    "Trees",
    `Invert Binary Tree|E
Maximum Depth of Binary Tree|E
Diameter of Binary Tree|E
Balanced Binary Tree|E
Same Tree|E
Subtree of Another Tree|E
Lowest Common Ancestor of a BST|M
Binary Tree Level Order Traversal|M
Binary Tree Right Side View|M
Count Good Nodes in Binary Tree|M
Validate Binary Search Tree|M
Kth Smallest Element in a BST|M
Construct Tree from Preorder and Inorder|M
Binary Tree Maximum Path Sum|H
Serialize and Deserialize Binary Tree|H`
  ),
  cat(
    "Heap / Priority Queue",
    `Kth Largest Element in a Stream|E
Last Stone Weight|E
K Closest Points to Origin|M
Kth Largest Element in an Array|M
Task Scheduler|M
Design Twitter|M
Find Median from Data Stream|H`
  ),
  cat(
    "Backtracking",
    `Subsets|M
Combination Sum|M
Permutations|M
Subsets II|M
Combination Sum II|M
Word Search|M
Palindrome Partitioning|M
Letter Combinations of a Phone Number|M
N-Queens|H`
  ),
  cat(
    "Graphs",
    `Number of Islands|M
Max Area of Island|M
Clone Graph|M
Walls and Gates|M
Rotting Oranges|M
Pacific Atlantic Water Flow|M
Surrounded Regions|M
Course Schedule|M
Course Schedule II|M
Number of Connected Components|M
Redundant Connection|M
Word Ladder|H`
  ),
  cat(
    "1-D Dynamic Programming",
    `Climbing Stairs|E
Min Cost Climbing Stairs|E
House Robber|M
House Robber II|M
Longest Palindromic Substring|M
Palindromic Substrings|M
Decode Ways|M
Coin Change|M
Maximum Product Subarray|M
Word Break|M
Longest Increasing Subsequence|M
Partition Equal Subset Sum|M`
  ),
  cat(
    "Greedy",
    `Maximum Subarray|M
Jump Game|M
Jump Game II|M
Gas Station|M
Hand of Straights|M
Partition Labels|M
Valid Parenthesis String|M`
  ),
  cat(
    "Intervals",
    `Insert Interval|M
Merge Intervals|M
Non-overlapping Intervals|M
Meeting Rooms|E
Meeting Rooms II|M
Minimum Interval to Include Each Query|H`
  ),
  cat(
    "Bit Manipulation",
    `Single Number|E
Number of 1 Bits|E
Counting Bits|E
Reverse Bits|E
Missing Number|E
Sum of Two Integers|M
Reverse Integer|M`
  ),
];

// Deterministically mark progress: ~58% solved, most of them optimal.
let _idx = 0;
for (const c of categories) {
  for (const p of c.items) {
    const r = (_idx * 2654435761) >>> 0;
    p.done = r % 100 < 58;
    p.optimal = p.done && r % 100 < 40;
    _idx++;
  }
}

const flatProblems = categories.flatMap((c) => c.items);
const TOTAL = flatProblems.length;
const SOLVED = flatProblems.filter((p) => p.done).length;

// deterministic solved-per-day counts for any month
function monthCounts(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const r = ((year * 12 + month) * 31 + i * 73 + 11) % 17;
    return r > 11 ? 3 : r > 8 ? 2 : r > 4 ? 1 : 0;
  });
}

// the streak calendar runs across summer: June–September 2026
const CAL_START = { year: 2026, month: 5 };
const CAL_END = { year: 2026, month: 8 };

const diffStyles: Record<string, string> = {
  Easy: "bg-sky text-sky-foreground",
  Medium: "bg-[#f5c26b] text-[#5a3a0a]",
  Hard: "bg-coral text-white",
};

// Shown only on problems solved with an optimal-complexity solution.
function OptimalTag() {
  return (
    <span className="shrink-0 rounded-full bg-[#d5f0db] px-2 py-0.5 text-[10px] font-medium text-[#2f7d46]">
      Optimal
    </span>
  );
}

const avatarColor: Record<string, string> = {
  JD: "bg-[#111] text-white",
  MC: "bg-coral text-white",
  AP: "bg-sky text-sky-foreground",
  SO: "bg-[#f5c26b] text-[#5a3a0a]",
  LP: "bg-sky text-sky-foreground",
  RS: "bg-coral text-white",
  TH: "bg-[#f5c26b] text-[#5a3a0a]",
  NB: "bg-[#111] text-white",
  OD: "bg-sky text-sky-foreground",
  PN: "bg-coral text-white",
  MB: "bg-[#f5c26b] text-[#5a3a0a]",
  YT: "bg-[#111] text-white",
  HK: "bg-sky text-sky-foreground",
  LC: "bg-coral text-white",
};

const nameByInitials: Record<string, string> = Object.fromEntries(
  members.map((m) => [m.initials, m.name])
);

function Avatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <div
      title={nameByInitials[initials] ?? initials}
      className={`inline-flex items-center justify-center rounded-full text-[11px] font-medium ring-2 ring-white ${avatarColor[initials] ?? "bg-muted"}`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

// Overlapping solver circles; collapses the overflow into a "+N" chip.
function AvatarStack({ who, cap }: { who: string[]; cap: number }) {
  const shown = who.slice(0, cap);
  const rest = who.slice(cap);
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((w) => (
        <Avatar key={w} initials={w} />
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((w) => nameByInitials[w] ?? w).join(", ")}
          className="inline-flex h-7 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground ring-2 ring-white"
        >
          +{rest.length}
        </span>
      )}
    </div>
  );
}

function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group rounded-[20px] bg-card border border-border p-6 shadow-[0_8px_30px_-12px_rgba(7,55,129,0.18)] backdrop-blur-md ${
        onClick
          ? "cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(7,55,129,0.28)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* Concentric-circle breakdown — the nested rings echo the group's totals. */
function CircleChart({
  data,
  size = 180,
}: {
  data: { label: string; val: number }[];
  size?: number;
}) {
  const sorted = [...data].sort((a, b) => b.val - a.val);
  const max = sorted[0].val;
  const maxSize = size;
  const shades = ["bg-coral/15", "bg-coral/35", "bg-coral"];
  const swatch = ["bg-coral/30", "bg-coral/55", "bg-coral"];
  return (
    <div>
      {/* legend sits above the rings so the values never crowd the circles */}
      <div className="mb-3 flex items-center justify-center gap-4">
        {sorted.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${swatch[i]}`} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">{d.val}</span>
          </div>
        ))}
      </div>
      <div className="relative mx-auto" style={{ height: maxSize, width: maxSize }}>
        {sorted.map((d, i) => {
          const size = Math.max((d.val / max) * maxSize, 48);
          return (
            <div
              key={d.label}
              className={`absolute left-1/2 -translate-x-1/2 rounded-full ${shades[i]}`}
              style={{ width: size, height: size, bottom: 0 }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  maxW = "max-w-4xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-sky-foreground/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`modal-surface relative max-h-[88vh] w-full ${maxW} overflow-hidden rounded-[24px] border border-border shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)]`}
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur-md transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        {/* inner scroll area; the rounded parent clips its scrollbar at the corners */}
        <div className="modal-scroll max-h-[88vh] overflow-y-auto p-10">
          <div className="font-display text-3xl tracking-tight">{title}</div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [cal, setCal] = useState(CAL_START);
  const hello = greeting(new Date());

  const openCalendar = () => {
    setCal(CAL_START);
    setModal("calendar");
  };
  const calCounts = monthCounts(cal.year, cal.month);
  const calLabel = new Date(cal.year, cal.month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const atStart = cal.year === CAL_START.year && cal.month === CAL_START.month;
  const atEnd = cal.year === CAL_END.year && cal.month === CAL_END.month;
  const stepMonth = (dir: number) => {
    const d = new Date(cal.year, cal.month + dir, 1);
    setCal({ year: d.getFullYear(), month: d.getMonth() });
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const breakdown = [
    { label: "Easy", val: 114 },
    { label: "Medium", val: 102 },
    { label: "Hard", val: 58 },
  ];

  const pct = Math.round((SOLVED / TOTAL) * 100);
  const upNext = flatProblems.filter((p) => !p.done).slice(0, 6);

  // build a 7x14 heatmap
  const heat = Array.from({ length: 7 * 14 }, (_, i) => {
    const r = (i * 9301 + 49297) % 233280;
    const v = r / 233280;
    if (v > 0.78) return "coral";
    if (v > 0.5) return "sky";
    if (v > 0.3) return "soft";
    return "empty";
  });

  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />

      {/* Light / night mode toggle */}
      <button
        onClick={toggleDark}
        aria-label="Toggle dark mode"
        className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_10px_30px_-8px_rgba(7,55,129,0.4)] backdrop-blur-md transition hover:scale-105"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative mx-auto max-w-[1400px] space-y-8">
        {/* Top bar: logo left, profile right */}
        <div className="flex items-center justify-between">
          <div className="flex h-11 items-center rounded-2xl bg-[#111] px-5 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
            <span className="font-display text-xl tracking-[0.08em] text-white">
              KRONOS
            </span>
          </div>

          <div className="flex items-center gap-2.5 rounded-full border border-border bg-white/50 py-1.5 pl-1.5 pr-4 backdrop-blur-sm">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111] text-xs font-medium text-white">
              JD
            </div>
            <span className="text-sm font-medium text-foreground">Jordan Dev</span>
          </div>
        </div>

        {/* Greeting */}
        <header className="px-2 pb-2 pt-4 text-center md:pt-6">
          <h1 className="font-display text-[52px] leading-[1.02] tracking-tight text-foreground md:text-[64px]">
            {hello}, Jordan<span className="text-coral">.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-sky-foreground/80">
            Progress syncs automatically each morning, or grab the latest right now.
          </p>
          <button
            onClick={() => {
              setSyncing(true);
              setTimeout(() => setSyncing(false), 1100);
            }}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/50 px-4 py-2 text-sm font-medium text-sky-foreground backdrop-blur-sm transition hover:bg-white/70 disabled:opacity-70"
            disabled={syncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Synced 6:00 AM · Refresh"}
          </button>
        </header>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* My progress (with the calendar) */}
          <Card className="lg:col-span-1" onClick={() => setModal("me")}>
            <div className="text-[15px] font-medium">My progress</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="font-display text-[40px] leading-none tracking-tight">
                {SOLVED}
              </div>
              <div className="text-sm text-muted-foreground">/ {TOTAL} solved</div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-5 text-xs font-medium text-muted-foreground">
              NeetCode 150 · up next
            </div>
            <ul className="mt-3 space-y-1.5">
              {upNext.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-muted"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-[9px] text-transparent">
                    ✓
                  </span>
                  <span className="flex-1 truncate text-[13px] text-foreground">
                    {p.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}
                  >
                    {p.diff}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Leaderboard — the biggest box, next to the calendar */}
          <Card className="lg:col-span-2" onClick={() => setModal("leaderboard")}>
            <div className="flex items-center justify-between">
              <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> This month
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {members.slice(0, 4).map((m, i) => (
                <li
                  key={m.name}
                  className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5"
                >
                  <div className="w-5 text-sm font-medium text-muted-foreground tabular-nums">
                    {i + 1}
                  </div>
                  <div
                    className={`relative grid h-11 w-11 place-items-center rounded-full text-sm font-medium ${m.color}`}
                  >
                    {m.initials}
                    {i === 0 && (
                      <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                    )}
                  </div>
                  <div className="w-36">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Flame className="h-3 w-3 text-coral" />
                      {m.streak}-day streak
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={i === 0 ? "h-full bg-coral" : "h-full bg-sky"}
                        style={{ width: `${(m.solved / 150) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold tabular-nums">
                    {m.solved}
                    <span className="text-muted-foreground"> /150</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Group progress — with the concentric chart */}
          <Card className="lg:col-span-1" onClick={() => setModal("group")}>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-medium">Group progress</div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="font-display text-[40px] leading-none tracking-tight">274</div>
              <div className="text-sm text-muted-foreground">solved together</div>
            </div>

            <div className="mt-5">
              <CircleChart data={breakdown} />
            </div>
          </Card>

          {/* Current streak — opens the paginated calendar */}
          <Card className="lg:col-span-1" onClick={openCalendar}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-coral" /> Current streak
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-display text-[56px] leading-none tracking-tight">
                    13
                  </div>
                  <div className="text-sm text-muted-foreground">day streak</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Tue, December 19
              </div>
            </div>

            <div
              className="mt-6 grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(14, minmax(0,1fr))" }}
            >
              {heat.map((h, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[4px] ${
                    h === "coral"
                      ? "bg-coral"
                      : h === "sky"
                      ? "bg-sky"
                      : h === "soft"
                      ? "bg-sky/40"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>14 weeks ago</span>
              <span>Today</span>
            </div>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-1" onClick={() => setModal("recent")}>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-medium">Recent activity</div>
              <span className="text-xs text-muted-foreground">See all</span>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {recent.slice(0, 5).map((r) => (
                <li key={r.n} className="flex items-center gap-4 py-3.5">
                  <div className="w-10 text-xs text-muted-foreground tabular-nums">
                    #{r.n}
                  </div>
                  <div className="flex-1 text-sm">{r.name}</div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}
                  >
                    {r.diff}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {modal === "me" && (
        <Modal title="My progress" onClose={() => setModal(null)}>
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">{SOLVED} of {TOTAL}</b> solved across the
            NeetCode 150 roadmap. The tag shows whether your solution hit the optimal
            complexity.
          </p>
          <div className="mt-6 space-y-6">
            {categories.map((c) => {
              const done = c.items.filter((p) => p.done).length;
              return (
                <div key={c.title}>
                  <div className="flex items-center justify-between">
                    <div className="text-[15px] font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {done} / {c.items.length}
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {c.items.map((p) => (
                      <li
                        key={p.name}
                        className="flex items-center gap-3 rounded-xl px-3 py-1.5 transition hover:bg-muted"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                            p.done
                              ? "bg-coral text-white"
                              : "border border-border text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span
                          className={`flex-1 truncate text-sm ${
                            p.done ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {p.name}
                        </span>
                        {p.done && p.optimal && <OptimalTag />}
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}
                        >
                          {p.diff}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === "calendar" && (
        <Modal title={calLabel} onClose={() => setModal(null)}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Problems solved each day. Hover a square for the count.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => stepMonth(-1)}
                disabled={atStart}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => stepMonth(1)}
                disabled={atEnd}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {/* pad so day 1 lands on the right weekday */}
            {Array.from(
              { length: new Date(cal.year, cal.month, 1).getDay() },
              (_, i) => (
                <div key={`pad-${i}`} />
              )
            )}
            {calCounts.map((count, i) => {
              const tone =
                count >= 3
                  ? "bg-coral text-white"
                  : count === 2
                  ? "bg-coral/55 text-white"
                  : count === 1
                  ? "bg-coral/25 text-coral"
                  : "bg-muted text-muted-foreground";
              return (
                <div
                  key={i}
                  title={`${i + 1}: ${count} solved`}
                  className={`group/day relative flex aspect-square cursor-default items-center justify-center rounded-xl text-sm font-medium ${tone}`}
                >
                  {i + 1}
                  <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition group-hover/day:opacity-100">
                    {count} solved
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
            Less
            <span className="h-3 w-3 rounded bg-muted" />
            <span className="h-3 w-3 rounded bg-coral/25" />
            <span className="h-3 w-3 rounded bg-coral/55" />
            <span className="h-3 w-3 rounded bg-coral" />
            More
          </div>
        </Modal>
      )}

      {modal === "leaderboard" && (
        <Modal title="Summer 2026 Leaderboard" maxW="max-w-5xl" onClose={() => setModal(null)}>
          <ul className="space-y-3">
            {members.map((m, i) => (
              <li
                key={m.name}
                className="flex items-center gap-5 rounded-2xl border border-border px-5 py-4"
              >
                <div className="w-6 text-base font-medium text-muted-foreground tabular-nums">
                  {i + 1}
                </div>
                <div className={`relative grid h-12 w-12 place-items-center rounded-full text-sm font-medium ${m.color}`}>
                  {m.initials}
                  {i === 0 && (
                    <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                  )}
                </div>
                <div className="w-44">
                  <div className="text-[15px] font-medium">{m.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3 text-coral" />
                    {m.streak}-day streak
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={i === 0 ? "h-full bg-coral" : "h-full bg-sky"}
                      style={{ width: `${(m.solved / 150) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-base font-semibold tabular-nums">
                  {m.solved}
                  <span className="text-sm text-muted-foreground"> /150</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Ranked by total problems solved this summer.
          </p>
        </Modal>
      )}

      {modal === "group" && (
        <Modal title="Group progress" onClose={() => setModal(null)}>
          <div className="flex justify-center py-6">
            <CircleChart data={breakdown} size={360} />
          </div>
          {/* segments are proportions of the 274 solved, so the bar fills fully */}
          <div className="mt-2 flex h-3.5 w-full overflow-hidden rounded-full">
            <div className="bg-sky" style={{ width: `${(114 / 274) * 100}%` }} />
            <div className="bg-[#f5c26b]" style={{ width: `${(102 / 274) * 100}%` }} />
            <div className="bg-coral" style={{ width: `${(58 / 274) * 100}%` }} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Easy", val: 114, dot: "bg-sky" },
              { label: "Medium", val: 102, dot: "bg-[#f5c26b]" },
              { label: "Hard", val: 58, dot: "bg-coral" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.label}
                </div>
                <div className="font-display mt-2 text-xl tracking-tight">{s.val}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === "recent" && (
        <Modal title="Recent activity" onClose={() => setModal(null)}>
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.n} className="flex items-center gap-4 py-3">
                <div className="w-10 text-xs text-muted-foreground tabular-nums">#{r.n}</div>
                <div className="flex-1 text-sm">{r.name}</div>
                <div className="w-20">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}>
                    {r.diff}
                  </span>
                </div>
                <div className="flex w-28 justify-end">
                  <AvatarStack who={r.who} cap={3} />
                </div>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

/* Soft drifting clouds layered over the blue band at the top. */
function Clouds() {
  const puff = "absolute rounded-full bg-white/70 blur-2xl";
  return (
    <div className="clouds pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
      <div className="absolute left-[6%] top-[60px] h-40 w-[360px] [animation:cloud-drift_22s_ease-in-out_infinite_alternate]">
        <div className={`${puff} left-0 top-6 h-24 w-48`} />
        <div className={`${puff} left-28 top-0 h-32 w-44`} />
        <div className={`${puff} left-52 top-8 h-24 w-40`} />
      </div>
      <div className="absolute right-[8%] top-[28px] h-32 w-[300px] [animation:cloud-drift_28s_ease-in-out_infinite_alternate-reverse]">
        <div className={`${puff} left-0 top-4 h-20 w-40`} />
        <div className={`${puff} left-24 top-0 h-24 w-40`} />
        <div className={`${puff} left-44 top-6 h-20 w-36`} />
      </div>
      <div className="absolute left-[42%] top-[150px] h-28 w-[280px] [animation:cloud-drift_34s_ease-in-out_infinite_alternate]">
        <div className={`${puff} left-0 top-4 h-16 w-36`} />
        <div className={`${puff} left-24 top-0 h-20 w-36`} />
      </div>
    </div>
  );
}

export default App;
