package pad

import (
	"context"
	"errors"

	"kronos/internal/domain"
	"kronos/internal/platform/httpx"
)

type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/me/pads"):
		return httpx.Handled(httpx.Data(c.svc.List(ctx, uid)))
	case r.Is("GET", "/me/pads/progress"):
		return httpx.Handled(httpx.Data(c.svc.Progress(ctx, uid)))
	case r.Is("POST", "/me/pads"):
		var in StartInput
		r.Decode(&in)
		return httpx.Handled(respond(c.svc.Start(ctx, uid, in)))
	}

	if len(r.Parts) < 3 || r.Parts[0] != "me" || r.Parts[1] != "pads" {
		return httpx.Pass()
	}
	id := r.Parts[2]
	if !httpx.IsUUID(id) {
		return httpx.Handled(httpx.Error(404, "pad not found"))
	}

	switch {
	case r.Match("GET", "me", "pads", "*"):
		return httpx.Handled(respond(c.svc.Get(ctx, uid, id)))
	case r.Match("PUT", "me", "pads", "*"):
		var in SaveInput
		r.Decode(&in)
		v, err := c.svc.Save(ctx, uid, id, in)
		if err != nil {
			return httpx.Handled(fail(err))
		}
		return httpx.Handled(httpx.Reply(200, map[string]int{"version": v}))
	case r.Match("POST", "me", "pads", "*", "submit"):
		return httpx.Handled(respond(c.svc.Submit(ctx, uid, id)))
	case r.Match("DELETE", "me", "pads", "*"):
		if err := c.svc.Delete(ctx, uid, id); err != nil {
			return httpx.Handled(fail(err))
		}
		return httpx.Handled(httpx.Reply(204, nil))
	}
	return httpx.Pass()
}

func respond(p Pad, err error) (httpx.Response, error) {
	if err != nil {
		return fail(err)
	}
	return httpx.Reply(200, p)
}

func fail(err error) (httpx.Response, error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		return httpx.Error(404, "pad not found")
	case errors.Is(err, ErrInvalid):
		return httpx.Error(400, "invalid request")
	case errors.Is(err, ErrEmpty):
		return httpx.Error(400, "write something before submitting")
	case errors.Is(err, ErrStale):
		return httpx.Error(409, "this pad changed in another tab")
	case errors.Is(err, ErrState):
		return httpx.Error(409, "pad is not in a state that allows this")
	case errors.Is(err, ErrLimit):
		return httpx.Error(429, "limit reached, try again tomorrow")
	case errors.Is(err, ErrUnavailable):
		return httpx.Error(503, "practice is not configured")
	}
	return httpx.ServerError(err)
}
