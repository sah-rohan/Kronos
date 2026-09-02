import type { Problem } from "../types";
import { DIFFICULTY, difficultyFill } from "../lib/difficulty";

const DMAP = { E: "Easy", M: "Medium", H: "Hard" } as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cat(title: string, rows: string): { title: string; items: Problem[] } {
  const items = rows
    .trim()
    .split("\n")
    .map((line) => {
      const [name, d] = line.split("|");
      return {
        name: name.trim(),
        slug: slugify(name.trim()),
        diff: DMAP[d.trim() as "E" | "M" | "H"],
        done: false,
        optimal: false,
        blind75: false,
        neetcode150: true,
        neetcode250: true,
      };
    });
  return { title, items };
}

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export const categories = [
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

let idx = 0;
for (const c of categories) {
  for (const p of c.items) {
    const r = (idx * 2654435761) >>> 0;
    p.done = r % 100 < 58;
    p.optimal = p.done && r % 100 < 40;
    idx++;
  }
}

export const flatProblems = categories.flatMap((c) => c.items);
export const TOTAL = flatProblems.length;

export const diffStyles: Record<string, string> = Object.fromEntries(
  DIFFICULTY.map((d) => [d.label, difficultyFill(d)]),
);
