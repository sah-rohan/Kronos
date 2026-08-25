package social

// FriendRow is a person as they appear in a friend list, directory, or
// pending-request list.
type FriendRow struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Solved       int    `json:"solved"`
}
