package social

import (
	"context"
	"errors"

	"kronos/internal/domain"
	"kronos/internal/platform/httpx"
)

// Controller serves the friend graph and friend-scoped progress reads.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type idInput struct {
	ID string `json:"id"`
}

type usernameInput struct {
	Username string `json:"username"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/friends"):
		return httpx.Handled(httpx.Data(c.svc.Friends(ctx, uid)))

	case r.Is("GET", "/users"):
		return httpx.Handled(httpx.Data(c.svc.Directory(ctx, uid)))

	case r.Is("GET", "/friends/requests"):
		return httpx.Handled(httpx.Data(c.svc.IncomingRequests(ctx, uid)))

	case r.Is("POST", "/friends"):
		var in usernameInput
		r.Decode(&in)
		err := c.svc.SendRequest(ctx, uid, in.Username)
		switch {
		case errors.Is(err, domain.ErrNotFound):
			return httpx.Handled(httpx.Error(404, "no approved user with that username"))
		case errors.Is(err, domain.ErrSelfFriend):
			return httpx.Handled(httpx.Error(400, "you can't add yourself"))
		}
		return httpx.Handled(httpx.OK(err))

	case r.Is("POST", "/friends/requests/accept"):
		var in idInput
		r.Decode(&in)
		err := c.svc.AcceptRequest(ctx, uid, in.ID)
		if errors.Is(err, domain.ErrNotFound) {
			return httpx.Handled(httpx.Error(404, "no such request"))
		}
		return httpx.Handled(httpx.OK(err))

	case r.Is("POST", "/friends/requests/decline"):
		var in idInput
		r.Decode(&in)
		return httpx.Handled(httpx.OK(c.svc.DeclineRequest(ctx, uid, in.ID)))

	// DELETE /friends/{id}
	case r.Match("DELETE", "friends", "*"):
		return httpx.Handled(httpx.OK(c.svc.RemoveFriend(ctx, uid, r.Parts[1])))

	// GET /friends/{id}/progress
	case r.Match("GET", "friends", "*", "progress"):
		rows, err := c.svc.FriendProgress(ctx, uid, r.Parts[1])
		return httpx.Handled(c.friendData(rows, err))

	// GET /friends/{id}/calendar
	case r.Match("GET", "friends", "*", "calendar"):
		rows, err := c.svc.FriendCalendar(ctx, uid, r.Parts[1])
		return httpx.Handled(c.friendData(rows, err))

	// GET /friends/{id}/calendar/problems
	case r.Match("GET", "friends", "*", "calendar", "problems"):
		rows, err := c.svc.FriendCalendarProblems(ctx, uid, r.Parts[1])
		return httpx.Handled(c.friendData(rows, err))

	// GET /friends/{id}/problem/{slug}
	case r.Match("GET", "friends", "*", "problem", "*"):
		rows, err := c.svc.FriendSolution(ctx, uid, r.Parts[1], r.Parts[3], r.Query["recent"] == "1")
		if errors.Is(err, domain.ErrNotFound) {
			return httpx.Handled(httpx.Error(404, "no solution"))
		}
		return httpx.Handled(httpx.Data(rows, err))
	}

	return httpx.Pass()
}

// friendData renders a friend-scoped read, turning a failed authorization into
// the 404 the client expects.
func (c *Controller) friendData(rows any, err error) (httpx.Response, error) {
	if errors.Is(err, domain.ErrNotFound) {
		return httpx.Error(404, "not a friend")
	}
	return httpx.Data(rows, err)
}
