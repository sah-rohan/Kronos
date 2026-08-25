// Package api is the composition root for the HTTP surface. It builds every
// feature's repo -> service -> controller chain once at cold start, then
// dispatches each request to the first controller that claims it.
//
// The features themselves know nothing about each other's routes; adding one
// means writing its four files and appending it to the slice in New.
package api

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/admin"
	"kronos/internal/design"
	"kronos/internal/platform/httpx"
	"kronos/internal/progress"
	"kronos/internal/social"
	"kronos/internal/syncing"
	"kronos/internal/user"
)

// Config is everything the API needs from the environment, resolved once by
// the caller so no feature reaches for a secret on its own.
type Config struct {
	AdminClerkID string
	Season       int64
	LeetCodeSess string
}

// API dispatches authenticated requests across the feature controllers.
type API struct {
	users *user.Service

	// member controllers serve approved members, tried in order.
	member []httpx.Controller
	// adminC serves /admin/*, reached only by users whose role is admin.
	adminC httpx.Controller
}

// New wires the whole backend. Each feature owns its own chain; the only
// things shared are the connection pool and the domain types.
func New(pool *pgxpool.Pool, cfg Config) *API {
	// Repositories - one per feature, all over the same pool.
	userRepo := user.NewRepo(pool)
	adminRepo := admin.NewRepo(pool)
	progressRepo := progress.NewRepo(pool)
	socialRepo := social.NewRepo(pool)
	designRepo := design.NewRepo(pool)
	syncRepo := syncing.NewRepo(pool)

	// Services - where the cross-feature dependencies are declared explicitly:
	// social needs progress data, admin needs the user repo's username rules.
	userSvc := user.NewService(userRepo, cfg.AdminClerkID)
	progressSvc := progress.NewService(progressRepo)
	socialSvc := social.NewService(socialRepo, progressRepo)
	designSvc := design.NewService(designRepo)
	syncSvc := syncing.NewService(syncRepo, cfg.LeetCodeSess, cfg.Season)
	adminSvc := admin.NewService(adminRepo, userRepo)

	return &API{
		users: userSvc,
		member: []httpx.Controller{
			user.NewController(userSvc, cfg.Season),
			progress.NewController(progressSvc),
			social.NewController(socialSvc),
			design.NewController(designSvc),
			syncing.NewController(syncSvc),
		},
		adminC: admin.NewController(adminSvc),
	}
}

// preApproval are the only routes a member may reach before an admin approves
// them: reading their own record, and linking a LeetCode account (which is
// what gets them approved in the first place).
var preApproval = map[string]bool{
	"/me":         true,
	"/me/profile": true,
}

// Handle authenticates the caller, then dispatches to the feature controllers.
func (a *API) Handle(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	method := req.RequestContext.HTTP.Method
	path := req.RawPath

	if method == "OPTIONS" {
		return httpx.Reply(204, nil)
	}

	clerkID, ok := authenticate(ctx, req)
	if !ok {
		return httpx.Error(401, "unauthorized")
	}

	u, err := a.users.Authenticate(ctx, clerkID, displayName(req), userEmail(req))
	if err != nil {
		return httpx.ServerError(err)
	}

	r := &httpx.Request{
		Method: method,
		Path:   path,
		Parts:  httpx.Segments(path),
		Body:   req.Body,
		Query:  req.QueryStringParameters,
		User:   u,
	}

	// Admins reach /admin/* directly; the controller trusts this gate.
	if u.IsAdmin() && len(r.Parts) > 0 && r.Parts[0] == "admin" {
		return dispatch(a.adminC, r)
	}

	if !u.Approved() && !preApproval[path] {
		return httpx.Error(403, "pending approval")
	}

	for _, c := range a.member {
		if resp, handled, err := c.Route(r); handled {
			return resp, err
		}
	}
	return httpx.NotFound()
}

// dispatch runs a single controller, turning an unclaimed route into a 404.
func dispatch(c httpx.Controller, r *httpx.Request) (events.APIGatewayV2HTTPResponse, error) {
	if resp, handled, err := c.Route(r); handled {
		return resp, err
	}
	return httpx.NotFound()
}
