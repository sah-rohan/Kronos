package coach

import (
	"context"
	"errors"

	"kronos/internal/platform/httpx"
)

// Controller serves the coach. Every route reads only r.User's own record, so
// the model is never given one member's evidence while answering another.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type chatInput struct {
	Message string `json:"message"`
	JobID   string `json:"jobId"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/me/coach"):
		return httpx.Handled(httpx.Reply(200, map[string]bool{"available": c.svc.Available()}))

	case r.Is("GET", "/me/coach/history"):
		turns, err := c.svc.History(ctx, uid, r.Query["jobId"])
		if errors.Is(err, ErrInvalid) {
			return httpx.Handled(httpx.Error(400, "invalid thread"))
		}
		return httpx.Handled(httpx.Data(turns, err))

	case r.Is("DELETE", "/me/coach/history"):
		err := c.svc.Clear(ctx, uid, r.Query["jobId"])
		if errors.Is(err, ErrInvalid) {
			return httpx.Handled(httpx.Error(400, "invalid thread"))
		}
		return httpx.Handled(httpx.OK(err))

	// The evidence the model would be given, so a member can audit it.
	case r.Is("POST", "/me/coach/context"):
		var in chatInput
		r.Decode(&in)
		text, meta, err := c.svc.Context(ctx, r.User, in.JobID, in.Message)
		if errors.Is(err, ErrInvalid) {
			return httpx.Handled(httpx.Error(400, "invalid thread"))
		}
		if err != nil {
			return httpx.Handled(httpx.ServerError(err))
		}
		meta.Reply = text
		return httpx.Handled(httpx.Reply(200, meta))

	case r.Is("POST", "/me/coach/chat"):
		var in chatInput
		r.Decode(&in)
		reply, err := c.svc.Chat(ctx, r.User, in.JobID, in.Message)
		switch {
		case errors.Is(err, ErrInvalid):
			return httpx.Handled(httpx.Error(400, "invalid question"))
		case errors.Is(err, ErrLimit):
			return httpx.Handled(httpx.Error(429, "limit reached, try again tomorrow"))
		case errors.Is(err, ErrUnavailable):
			return httpx.Handled(httpx.Error(503, "coach is not configured"))
		}
		return httpx.Handled(httpx.Data(reply, err))
	}

	return httpx.Pass()
}
