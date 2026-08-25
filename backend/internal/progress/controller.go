package progress

import (
	"context"

	"kronos/internal/platform/httpx"
)

// Controller serves the member's own progress plus the group-wide boards.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/leaderboard"):
		return httpx.Handled(httpx.Data(c.svc.Leaderboard(ctx)))

	case r.Is("GET", "/recent"):
		return httpx.Handled(httpx.Data(c.svc.Recent(ctx)))

	case r.Is("GET", "/group/difficulty"):
		return httpx.Handled(httpx.Data(c.svc.GroupDifficulty(ctx)))

	case r.Is("GET", "/me/circle"):
		return httpx.Handled(httpx.Data(c.svc.CircleDifficulty(ctx, uid)))

	case r.Is("GET", "/me/progress"):
		return httpx.Handled(httpx.Data(c.svc.Progress(ctx, uid)))

	case r.Is("GET", "/me/calendar"):
		return httpx.Handled(httpx.Data(c.svc.Calendar(ctx, uid)))

	case r.Is("GET", "/me/calendar/problems"):
		return httpx.Handled(httpx.Data(c.svc.CalendarProblems(ctx, uid)))

	// GET /me/problem/{slug}
	case r.Match("GET", "me", "problem", "*"):
		return httpx.Handled(httpx.Data(c.svc.MySolution(ctx, uid, r.Parts[2], r.Query["recent"] == "1")))
	}

	return httpx.Pass()
}
