package user

import "errors"

// ErrUsernameRequired is a validation failure the controller maps to 400. It
// is feature-local: no other package needs to distinguish it.
var ErrUsernameRequired = errors.New("username required")

// Request payloads the user feature accepts. Keeping them named (rather than
// anonymous structs inside handlers) lets the service validate them and keeps
// the controller down to decode-then-delegate.

type ProfileUpdate struct {
	Username string `json:"username"`
	Github   string `json:"github"`
}

type UsernameRequest struct {
	Username string `json:"username"`
}

type ThemeUpdate struct {
	Theme string `json:"theme"`
}
