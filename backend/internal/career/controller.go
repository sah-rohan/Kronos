package career

import (
	"context"
	"errors"

	"kronos/internal/platform/httpx"
)

// Controller serves a member's own career documents. Every route is under
// /me/, and every query is scoped to r.User.ID, so there is no route through
// which one member reaches another's resume.
type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type resumeInput struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Content string `json:"content"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	ctx := context.Background()
	uid := r.User.ID

	// Every id route below reads r.Parts[2] as a uuid, so a malformed one is a
	// bad request, not the 500 Postgres would otherwise raise on the cast.
	if len(r.Parts) > 2 && r.Parts[0] == "me" &&
		(r.Parts[1] == "resumes" || r.Parts[1] == "jobs") && !httpx.IsUUID(r.Parts[2]) {
		return httpx.Handled(httpx.Error(400, "invalid id"))
	}

	switch {
	case r.Is("GET", "/me/resumes"):
		return httpx.Handled(httpx.Data(c.svc.Resumes(ctx, uid)))

	case r.Is("POST", "/me/resumes"):
		var in resumeInput
		r.Decode(&in)
		id, err := c.svc.SaveResume(ctx, uid, in.ID, in.Label, in.Content)
		return httpx.Handled(c.saved(id, err))

	// POST /me/resumes/{id}/primary - matched before the 3-segment routes.
	case r.Match("POST", "me", "resumes", "*", "primary"):
		return httpx.Handled(c.ok(c.svc.SetPrimaryResume(ctx, uid, r.Parts[2])))

	case r.Match("GET", "me", "resumes", "*"):
		resume, err := c.svc.Resume(ctx, uid, r.Parts[2])
		if NotFound(err) {
			return httpx.Handled(httpx.Error(404, "not found"))
		}
		return httpx.Handled(httpx.Data(resume, err))

	case r.Match("DELETE", "me", "resumes", "*"):
		return httpx.Handled(httpx.OK(c.svc.DeleteResume(ctx, uid, r.Parts[2])))

	case r.Is("GET", "/me/jobs"):
		return httpx.Handled(httpx.Data(c.svc.Jobs(ctx, uid)))

	case r.Is("POST", "/me/jobs"):
		var in Job
		r.Decode(&in)
		id, err := c.svc.SaveJob(ctx, uid, in)
		return httpx.Handled(c.saved(id, err))

	case r.Match("GET", "me", "jobs", "*"):
		job, err := c.svc.Job(ctx, uid, r.Parts[2])
		if NotFound(err) {
			return httpx.Handled(httpx.Error(404, "not found"))
		}
		return httpx.Handled(httpx.Data(job, err))

	case r.Match("DELETE", "me", "jobs", "*"):
		return httpx.Handled(httpx.OK(c.svc.DeleteJob(ctx, uid, r.Parts[2])))
	}

	return httpx.Pass()
}

// saved turns a write into {"id": ...}, mapping the two failures a client can
// cause onto 400 and 404 rather than a 500.
func (c *Controller) saved(id string, err error) (httpx.Response, error) {
	switch {
	case errors.Is(err, ErrInvalid):
		return httpx.Error(400, "invalid input")
	case NotFound(err):
		return httpx.Error(404, "not found")
	case err != nil:
		return httpx.ServerError(err)
	}
	return httpx.Reply(200, map[string]string{"id": id})
}

func (c *Controller) ok(err error) (httpx.Response, error) {
	if NotFound(err) {
		return httpx.Error(404, "not found")
	}
	return httpx.OK(err)
}
