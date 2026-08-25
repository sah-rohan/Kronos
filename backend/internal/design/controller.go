package design

import (
	"context"
	"encoding/json"
	"errors"

	"kronos/internal/platform/httpx"
)

// Controller serves module progress: the member's own solves and attempts,
// plus the group-wide System Design / GenAI boards.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type attemptInput struct {
	Design json.RawMessage `json:"design"`
	OK     bool            `json:"ok"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/me/sd"):
		return httpx.Handled(httpx.Data(c.svc.Solved(ctx, uid)))

	case r.Is("GET", "/me/sd/activity"):
		return httpx.Handled(httpx.Data(c.svc.MyActivity(ctx, uid)))

	case r.Is("GET", "/sd/leaderboard"):
		return httpx.Handled(httpx.Data(c.svc.Leaderboard(ctx, r.Query["kind"])))

	case r.Is("GET", "/sd/activity"):
		return httpx.Handled(httpx.Data(c.svc.Activity(ctx, r.Query["kind"])))

	// POST /me/sd/{slug}/attempt - matched before the solve route below, which
	// would otherwise claim a 3-segment prefix of the same path.
	case r.Match("POST", "me", "sd", "*", "attempt"):
		var in attemptInput
		r.Decode(&in)
		err := c.svc.SaveAttempt(ctx, uid, r.Parts[2], string(in.Design), in.OK)
		if errors.Is(err, ErrBadDesign) {
			return httpx.Handled(httpx.Error(400, "bad design payload"))
		}
		return httpx.Handled(httpx.OK(err))

	// POST /me/sd/{slug}
	case r.Match("POST", "me", "sd", "*"):
		return httpx.Handled(httpx.OK(c.svc.RecordSolve(ctx, uid, r.Parts[2])))
	}

	return httpx.Pass()
}
