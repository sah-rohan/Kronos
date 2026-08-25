package admin

import "kronos/internal/domain"

// Analytics is the admin dashboard's summary of the whole instance.
type Analytics struct {
	Users    int               `json:"users"`    // active, approved members
	Pending  int               `json:"pending"`  // awaiting approval
	Solves   int               `json:"solves"`   // total season solves
	Solves7d int               `json:"solves7d"` // solves in the last 7 days
	Active7d int               `json:"active7d"` // distinct members who solved in last 7 days
	Views    int               `json:"views"`    // total app opens
	Views7d  int               `json:"views7d"`  // app opens in the last 7 days
	PerDay   []domain.DayCount `json:"perDay"`   // solves per UTC day, last 14 days
}

// SessionStatus reports the health of the stored LeetCode session without
// revealing the token itself.
type SessionStatus struct {
	ExpiresAt string `json:"expiresAt"`
	HasToken  bool   `json:"hasToken"`
}

// SessionUpdate replaces the LeetCode session credential. An empty Token means
// "keep the existing secret, just record a new expiry".
type SessionUpdate struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expiresAt"`
}
