package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
)

type category struct {
	name  string
	slugs []string
}

var canon = []category{
	{"Arrays & Hashing", []string{"contains-duplicate", "valid-anagram", "two-sum", "group-anagrams", "top-k-frequent-elements", "encode-and-decode-strings", "product-of-array-except-self", "valid-sudoku", "longest-consecutive-sequence"}},
	{"Two Pointers", []string{"valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water", "trapping-rain-water"}},
	{"Sliding Window", []string{"best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters", "longest-repeating-character-replacement", "permutation-in-string", "minimum-window-substring", "sliding-window-maximum"}},
	{"Stack", []string{"valid-parentheses", "min-stack", "evaluate-reverse-polish-notation", "generate-parentheses", "daily-temperatures", "car-fleet", "largest-rectangle-in-histogram"}},
	{"Binary Search", []string{"binary-search", "search-a-2d-matrix", "koko-eating-bananas", "find-minimum-in-rotated-sorted-array", "search-in-rotated-sorted-array", "time-based-key-value-store", "median-of-two-sorted-arrays"}},
	{"Linked List", []string{"reverse-linked-list", "merge-two-sorted-lists", "reorder-list", "remove-nth-node-from-end-of-list", "copy-list-with-random-pointer", "add-two-numbers", "linked-list-cycle", "find-the-duplicate-number", "lru-cache", "merge-k-sorted-lists", "reverse-nodes-in-k-group"}},
	{"Trees", []string{"invert-binary-tree", "maximum-depth-of-binary-tree", "diameter-of-binary-tree", "balanced-binary-tree", "same-tree", "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal", "binary-tree-right-side-view", "count-good-nodes-in-binary-tree", "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal", "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree"}},
	{"Tries", []string{"implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii"}},
	{"Heap / Priority Queue", []string{"kth-largest-element-in-a-stream", "last-stone-weight", "k-closest-points-to-origin", "kth-largest-element-in-an-array", "task-scheduler", "design-twitter", "find-median-from-data-stream"}},
	{"Backtracking", []string{"subsets", "combination-sum", "permutations", "subsets-ii", "combination-sum-ii", "word-search", "palindrome-partitioning", "letter-combinations-of-a-phone-number", "n-queens"}},
	{"Graphs", []string{"number-of-islands", "max-area-of-island", "clone-graph", "walls-and-gates", "rotting-oranges", "pacific-atlantic-water-flow", "surrounded-regions", "course-schedule", "course-schedule-ii", "graph-valid-tree", "number-of-connected-components-in-an-undirected-graph", "redundant-connection", "word-ladder"}},
	{"Advanced Graphs", []string{"reconstruct-itinerary", "min-cost-to-connect-all-points", "network-delay-time", "swim-in-rising-water", "alien-dictionary", "cheapest-flights-within-k-stops"}},
	{"1-D Dynamic Programming", []string{"climbing-stairs", "min-cost-climbing-stairs", "house-robber", "house-robber-ii", "longest-palindromic-substring", "palindromic-substrings", "decode-ways", "coin-change", "maximum-product-subarray", "word-break", "longest-increasing-subsequence", "partition-equal-subset-sum"}},
	{"2-D Dynamic Programming", []string{"unique-paths", "longest-common-subsequence", "best-time-to-buy-and-sell-stock-with-cooldown", "coin-change-ii", "target-sum", "interleaving-string", "longest-increasing-path-in-a-matrix", "distinct-subsequences", "edit-distance", "burst-balloons", "regular-expression-matching"}},
	{"Greedy", []string{"maximum-subarray", "jump-game", "jump-game-ii", "gas-station", "hand-of-straights", "merge-triplets-to-form-target-triplet", "partition-labels", "valid-parenthesis-string"}},
	{"Intervals", []string{"insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii", "minimum-interval-to-include-each-query"}},
	{"Math & Geometry", []string{"rotate-image", "spiral-matrix", "set-matrix-zeroes", "happy-number", "plus-one", "powx-n", "multiply-strings", "detect-squares"}},
	{"Bit Manipulation", []string{"single-number", "number-of-1-bits", "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers", "reverse-integer"}},
}

type problemMeta struct {
	id         int
	title      string
	difficulty string
}

func fetchCatalog() (map[string]problemMeta, error) {
	const query = `query($c:String,$l:Int,$s:Int,$f:QuestionListFilterInput){questionList(categorySlug:$c,limit:$l,skip:$s,filters:$f){total:totalNum data{questionFrontendId titleSlug title difficulty}}}`
	const page = 100
	meta := map[string]problemMeta{}
	for skip := 0; ; skip += page {
		body, _ := json.Marshal(map[string]any{
			"query":     query,
			"variables": map[string]any{"c": "", "l": page, "s": skip, "f": map[string]any{}},
		})
		req, _ := http.NewRequest(http.MethodPost, "https://leetcode.com/graphql", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Referer", "https://leetcode.com")
		req.Header.Set("User-Agent", "Mozilla/5.0 AppleWebKit/537.36 Chrome/120")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		var out struct {
			Data struct {
				QuestionList struct {
					Total int `json:"total"`
					Data  []struct {
						ID         string `json:"questionFrontendId"`
						Slug       string `json:"titleSlug"`
						Title      string `json:"title"`
						Difficulty string `json:"difficulty"`
					} `json:"data"`
				} `json:"questionList"`
			} `json:"data"`
		}
		err = json.NewDecoder(resp.Body).Decode(&out)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		for _, q := range out.Data.QuestionList.Data {
			id, _ := strconv.Atoi(q.ID)
			meta[q.Slug] = problemMeta{id: id, title: q.Title, difficulty: q.Difficulty}
		}
		fmt.Printf("\rfetched %d/%d", min(skip+page, out.Data.QuestionList.Total), out.Data.QuestionList.Total)
		if skip+page >= out.Data.QuestionList.Total || len(out.Data.QuestionList.Data) == 0 {
			break
		}
	}
	fmt.Println()
	return meta, nil
}

func main() {
	meta, err := fetchCatalog()
	if err != nil {
		fmt.Println("fetch:", err)
		os.Exit(1)
	}

	var rows []string
	var missing []string
	for _, cat := range canon {
		for _, slug := range cat.slugs {
			m, ok := meta[slug]
			if !ok {
				missing = append(missing, slug)
				continue
			}
			rows = append(rows, fmt.Sprintf("(%d, '%s', '%s', '%s', '%s')",
				m.id, slug, escape(m.title), m.difficulty, escape(cat.name)))
		}
	}

	if len(missing) > 0 {
		fmt.Printf("missing %d: %s\n", len(missing), strings.Join(missing, ", "))
		os.Exit(1)
	}

	sql := "insert into problems (id, slug, title, difficulty, category) values\n" +
		strings.Join(rows, ",\n") +
		"\non conflict (id) do update set\n" +
		"  slug = excluded.slug, title = excluded.title,\n" +
		"  difficulty = excluded.difficulty, category = excluded.category;\n"

	if err := os.WriteFile("db/seed_problems.sql", []byte(sql), 0o644); err != nil {
		fmt.Println("write:", err)
		os.Exit(1)
	}
	fmt.Printf("wrote %d problems to db/seed_problems.sql\n", len(rows))
}

func escape(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}
