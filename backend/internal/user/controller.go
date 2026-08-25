package user

import (
	"context"
	"errors"

	"kronos/internal/domain"
	"kronos/internal/platform/httpx"
)

// Controller serves the member's own identity: profile, preferences, and the
// /me bootstrap the frontend loads on start.
type Controller struct {
	svc *Service
	// season is the season-start epoch the client needs alongside /me.
	season int64
}

func NewController(svc *Service, season int64) *Controller {
	return &Controller{svc: svc, season: season}
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()

	switch {
	case r.Is("GET", "/me"):
		return httpx.Handled(httpx.Reply(200, struct {
			domain.User
			Season int64 `json:"season"`
		}{r.User, c.season}))

	case r.Is("POST", "/me/profile"):
		var in ProfileUpdate
		r.Decode(&in)
		err := c.svc.UpdateProfile(ctx, r.User.ID, in)
		if errors.Is(err, domain.ErrUsernameTaken) {
			return httpx.Handled(httpx.Error(409, "username taken"))
		}
		return httpx.Handled(httpx.OK(err))

	case r.Is("POST", "/me/username-request"):
		var in UsernameRequest
		r.Decode(&in)
		err := c.svc.RequestUsername(ctx, r.User.ID, in)
		if errors.Is(err, ErrUsernameRequired) {
			return httpx.Handled(httpx.Error(400, "username required"))
		}
		return httpx.Handled(httpx.OK(err))

	case r.Is("POST", "/me/theme"):
		var in ThemeUpdate
		r.Decode(&in)
		return httpx.Handled(httpx.OK(c.svc.SetTheme(ctx, r.User.ID, in.Theme)))

	case r.Is("POST", "/me/visit"):
		return httpx.Handled(httpx.OK(c.svc.RecordVisit(ctx, r.User.ID)))
	}

	return httpx.Pass()
}
