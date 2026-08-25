package admin

import (
	"context"
	"errors"

	"kronos/internal/domain"
	"kronos/internal/platform/httpx"
)

// Controller serves /admin/*. The router only dispatches here for users whose
// role is admin, so these handlers do not re-check authorization.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type idInput struct {
	ID string `json:"id"`
}

type usernameInput struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()

	switch {
	case r.Is("GET", "/admin/pending"):
		return httpx.Handled(httpx.Data(c.svc.Pending(ctx)))

	case r.Is("GET", "/admin/users"):
		return httpx.Handled(httpx.Data(c.svc.AllUsers(ctx)))

	case r.Is("GET", "/admin/analytics"):
		return httpx.Handled(httpx.Data(c.svc.Analytics(ctx)))

	case r.Is("POST", "/admin/approve"):
		var in idInput
		r.Decode(&in)
		return httpx.Handled(httpx.OK(c.svc.Approve(ctx, in.ID)))

	case r.Is("POST", "/admin/username"):
		var in usernameInput
		r.Decode(&in)
		err := c.svc.SetUsername(ctx, in.ID, in.Username)
		if errors.Is(err, domain.ErrUsernameTaken) {
			return httpx.Handled(httpx.Error(409, "username taken"))
		}
		return httpx.Handled(httpx.OK(err))

	case r.Is("GET", "/admin/leetcode-session"):
		return httpx.Handled(httpx.Data(c.svc.SessionStatus(ctx)))

	case r.Is("POST", "/admin/leetcode-session"):
		var in SessionUpdate
		r.Decode(&in)
		return httpx.Handled(httpx.OK(c.svc.SaveSession(ctx, in)))

	// DELETE /admin/users/{id}/purge - matched before the plain delete below.
	case r.Match("DELETE", "admin", "users", "*", "purge"):
		return httpx.Handled(httpx.OK(c.svc.PurgeUser(ctx, r.Parts[2])))

	// DELETE /admin/users/{id}
	case r.Match("DELETE", "admin", "users", "*"):
		return httpx.Handled(httpx.OK(c.svc.DeleteUser(ctx, r.Parts[2])))
	}

	return httpx.Pass()
}
