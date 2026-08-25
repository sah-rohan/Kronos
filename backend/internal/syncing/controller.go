package syncing

import (
	"context"

	"kronos/internal/platform/httpx"
)

// Controller exposes the member-triggered "sync now" action. The scheduled
// passes have no HTTP surface - they run from cmd/sync and cmd/enrich against
// the same Service.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	if r.Is("POST", "/me/sync") {
		err := c.svc.SyncMember(context.Background(), r.User.ID, r.User.LeetcodeUser)
		return httpx.Handled(httpx.OK(err))
	}
	return httpx.Pass()
}
