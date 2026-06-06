import type { Friend, Solution } from "../types";
import { flatProblems } from "./problems";

export const initialFriends: Friend[] = [
  { name: "Mira Chen", initials: "MC", username: "mirac", color: "bg-coral text-white" },
  { name: "Ari Patel", initials: "AP", username: "aripatel", color: "bg-sky text-sky-foreground" },
  { name: "Sam Ortega", initials: "SO", username: "sortega", color: "bg-[#f5c26b] text-[#5a3a0a]" },
];

export const langStyles: Record<string, string> = {
  Python: "bg-sky text-sky-foreground",
  "C++": "bg-coral text-white",
  Java: "bg-[#f5c26b] text-[#5a3a0a]",
  Go: "bg-[#9bd8a9] text-[#1f4d2b]",
  JavaScript: "bg-[#f7df9a] text-[#5a4a0a]",
};

const codeSamples: Record<string, (name: string) => string> = {
  Python: (n) => `class Solution:\n    def solve(self, nums):\n        # ${n}\n        seen = {}\n        for i, x in enumerate(nums):\n            if x in seen:\n                return [seen[x], i]\n            seen[x] = i`,
  "C++": (n) => `class Solution {\npublic:\n    // ${n}\n    vector<int> solve(vector<int>& nums) {\n        unordered_map<int,int> seen;\n        for (int i = 0; i < nums.size(); i++) {\n            if (seen.count(nums[i])) return {seen[nums[i]], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
  Java: (n) => `class Solution {\n    // ${n}\n    public int[] solve(int[] nums) {\n        Map<Integer,Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            if (seen.containsKey(nums[i])) return new int[]{seen.get(nums[i]), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
  Go: (n) => `func solve(nums []int) []int {\n    // ${n}\n    seen := map[int]int{}\n    for i, x := range nums {\n        if j, ok := seen[x]; ok {\n            return []int{j, i}\n        }\n        seen[x] = i\n    }\n    return nil\n}`,
  JavaScript: (n) => `// ${n}\nvar solve = function (nums) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        if (seen.has(nums[i])) return [seen.get(nums[i]), i];\n        seen.set(nums[i], i);\n    }\n};`,
};

const langPool = ["Python", "C++", "Java", "Go", "JavaScript"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function friendSolved(f: Friend, slug: string): boolean {
  return hash(f.username + slug) % 100 < 55;
}

function solutionsFor(key: string, slug: string): Solution[] {
  const count = (hash(key + slug) % 3) + 1;
  const start = hash(key + slug + "lang") % langPool.length;
  return Array.from({ length: count }, (_, i) => {
    const lang = langPool[(start + i) % langPool.length];
    const h = hash(key + slug + lang);
    const runtimePct = Math.round(((h >>> 3) % 9500) / 100 + 5);
    return {
      lang,
      runtimeMs: (h % 180) + 4,
      runtimePct,
      optimal: runtimePct >= 85,
      code: codeSamples[lang](slug),
    };
  }).sort((a, b) => b.runtimePct - a.runtimePct);
}

export function friendSolutions(f: Friend, slug: string): Solution[] {
  return solutionsFor(f.username, slug);
}

export function friendOptimal(f: Friend, slug: string): boolean {
  return friendSolutions(f, slug).some((s) => s.optimal);
}

export function mySolutions(slug: string): Solution[] {
  return solutionsFor("you", slug);
}

export function friendSolvedCount(f: Friend): number {
  return flatProblems.reduce((n, p) => (friendSolved(f, p.name) ? n + 1 : n), 0);
}

const recentTimes = ["2h ago", "5h ago", "1d ago", "3h ago", "yesterday"];

export function friendRecent(f: Friend) {
  const h = hash(f.username);
  return {
    problem: flatProblems[h % flatProblems.length].name,
    when: recentTimes[h % recentTimes.length],
  };
}
