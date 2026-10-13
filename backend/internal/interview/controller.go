package interview

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

type turnInput struct {
	Message string `json:"message"`
	Code    string `json:"code"`
	Version int    `json:"version"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	switch {
	case r.Is("GET", "/me/interviews"):
		return httpx.Handled(httpx.Data(c.svc.List(ctx, uid)))

	case r.Is("GET", "/me/interviews/progress"):
		return httpx.Handled(httpx.Data(c.svc.Progress(ctx, uid)))

	case r.Is("POST", "/me/interviews"):
		var in StartInput
		r.Decode(&in)
		return httpx.Handled(respond(c.svc.Start(ctx, r.User, in)))
	}

	if len(r.Parts) < 3 || r.Parts[0] != "me" || r.Parts[1] != "interviews" {
		return httpx.Pass()
	}
	id := r.Parts[2]
	if !httpx.IsUUID(id) {
		return httpx.Handled(httpx.Error(404, "interview not found"))
	}

	switch {
	case r.Match("GET", "me", "interviews", "*"):
		return httpx.Handled(respond(c.svc.Get(ctx, uid, id)))

	case r.Match("POST", "me", "interviews", "*", "turns"):
		var in turnInput
		r.Decode(&in)
		return httpx.Handled(respond(c.svc.Reply(ctx, uid, id, in.Message, in.Code, in.Version)))

	case r.Match("PUT", "me", "interviews", "*", "code"):
		var in CodeInput
		r.Decode(&in)
		v, err := c.svc.SaveCode(ctx, uid, id, in)
		if err != nil {
			return httpx.Handled(respond(Interview{}, err))
		}
		return httpx.Handled(httpx.Reply(200, map[string]int{"version": v}))

	case r.Match("POST", "me", "interviews", "*", "observe"):
		var in turnInput
		r.Decode(&in)
		return httpx.Handled(respond(c.svc.Observe(ctx, uid, id, in.Version)))

	case r.Match("POST", "me", "interviews", "*", "end"):
		return httpx.Handled(respond(c.svc.End(ctx, uid, id)))

	case r.Match("POST", "me", "interviews", "*", "followups"):
		var in turnInput
		r.Decode(&in)
		return httpx.Handled(respond(c.svc.Followup(ctx, uid, id, in.Message)))
	}

	return httpx.Pass()
}

func respond(iv Interview, err error) (httpx.Response, error) {
	switch {
	case err == nil:
		return httpx.Reply(200, iv)
	case errors.Is(err, domain.ErrNotFound):
		return httpx.Error(404, "interview not found")
	case errors.Is(err, ErrInvalid):
		return httpx.Error(400, "invalid request")
	case errors.Is(err, ErrNoResume):
		return httpx.Error(400, "add a resume before starting a resume interview")
	case errors.Is(err, ErrLimit):
		return httpx.Error(429, "limit reached, try again tomorrow")
	case errors.Is(err, ErrStale):
		return httpx.Error(409, "the code changed in another tab")
	case errors.Is(err, ErrTooSoon):
		return httpx.Error(429, "checked too recently")
	case errors.Is(err, ErrState):
		return httpx.Error(409, "interview is not in a state that allows this")
	case errors.Is(err, ErrUnavailable):
		return httpx.Error(503, "interviews are not configured")
	case errors.Is(err, context.DeadlineExceeded):
		return httpx.Error(504, "the interviewer took too long, send that again")
	}
	return httpx.ServerError(err)
}
