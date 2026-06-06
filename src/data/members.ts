export const members = [
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

export const recent = [
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

export const avatarColor: Record<string, string> = {
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

export const nameByInitials: Record<string, string> = Object.fromEntries(
  members.map((m) => [m.initials, m.name])
);
