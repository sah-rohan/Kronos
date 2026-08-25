// Package domain holds the few types that genuinely cross feature boundaries:
// the authenticated user (every controller needs it) and the sentinel errors
// that repositories raise and controllers map onto status codes.
//
// Everything else lives in the feature package that owns it - a listing in
// jobs, a leaderboard row in progress - so this package stays small on
// purpose. It imports nothing outside the standard library, which is what
// keeps the feature packages free of import cycles.
package domain

import "errors"

type User struct {
	ID                string `json:"id"`
	ClerkID           string `json:"-"`
	LeetcodeUser      string `json:"username"`
	GithubUser        string `json:"github"`
	DisplayName       string `json:"name"`
	Email             string `json:"email"`
	Status            string `json:"status"`
	Role              string `json:"role"`
	Theme             string `json:"theme"`
	RequestedUsername string `json:"requestedUsername"`
}

// Approved reports whether the user may reach member endpoints.
func (u User) Approved() bool { return u.Status == "approved" }

// IsAdmin reports whether the user may reach /admin endpoints.
func (u User) IsAdmin() bool { return u.Role == "admin" }

// DayCount is a date bucket, shared by progress calendars and admin analytics.
type DayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

var (
	ErrNotFound      = errors.New("not found")
	ErrSelfFriend    = errors.New("cannot add yourself")
	ErrUsernameTaken = errors.New("leetcode username already taken")
)
