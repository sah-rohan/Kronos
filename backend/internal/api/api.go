// Package api is the composition root for the HTTP surface. It builds every
// feature's repo -> service -> controller chain once at cold start, then
// dispatches each request to the first controller that claims it.
//
// The features themselves know nothing about each other's routes; adding one
// means writing its four files and appending it to the slice in New.
package api

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/admin"
	"kronos/internal/career"
	"kronos/internal/coach"
	"kronos/internal/design"
	"kronos/internal/interview"
	"kronos/internal/pad"
	"kronos/internal/platform/ai"
	"kronos/internal/platform/httpx"
	"kronos/internal/platform/jobs"
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
	LeetCodeSess func(context.Context) string

	// Azure OpenAI, for the coach and interviews. Endpoint and Deployment empty
	// means no deployment is wired and those routes answer 503.
	AzureEndpoint   string
	AzureDeployment string
	AzureKey        string
	AzureEffort     string
	// The interview grader: a stronger deployment, fed by an SQS queue.
	GraderDeployment string
	GraderEffort     string
	GradeQueueURL    string
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
	careerRepo := career.NewRepo(pool)
	coachRepo := coach.NewRepo(pool)
	interviewRepo := interview.NewRepo(pool)
	padRepo := pad.NewRepo(pool)

	// Services - where the cross-feature dependencies are declared explicitly:
	// social needs progress data, admin needs the user repo's username rules.
	userSvc := user.NewService(userRepo, cfg.AdminClerkID)
	progressSvc := progress.NewService(progressRepo)
	socialSvc := social.NewService(socialRepo, progressRepo)
	designSvc := design.NewService(designRepo)
	syncSvc := syncing.NewService(syncRepo, cfg.LeetCodeSess, cfg.Season)
	adminSvc := admin.NewService(adminRepo, userRepo)
	careerSvc := career.NewService(careerRepo)
	// The coach is the only feature that reaches outside the database: it reads
	// progress and career documents, then asks Azure OpenAI about them.
	coachSvc := coach.NewService(coachRepo, careerRepo,
		ai.New(cfg.AzureEndpoint, cfg.AzureDeployment, cfg.AzureKey, cfg.AzureEffort))
	interviewSvc := NewInterviews(interviewRepo, careerRepo, cfg)
	padSvc := NewPads(padRepo, cfg)

	return &API{
		users: userSvc,
		member: []httpx.Controller{
			user.NewController(userSvc, cfg.Season),
			progress.NewController(progressSvc),
			social.NewController(socialSvc),
			design.NewController(designSvc),
			syncing.NewController(syncSvc),
			career.NewController(careerSvc),
			coach.NewController(coachSvc),
			interview.NewController(interviewSvc),
			pad.NewController(padSvc),
		},
		adminC: admin.NewController(adminSvc),
	}
}

// NewInterviews builds the interview service: a fast interviewer for live turns,
// a stronger grader for the debrief.
func NewInterviews(repo *interview.Repo, careerRepo *career.Repo, cfg Config) *interview.Service {
	interviewer := ai.New(cfg.AzureEndpoint, cfg.AzureDeployment, cfg.AzureKey, "medium")
	svc := interview.NewService(repo, careerRepo, interviewer, grader(cfg))
	svc.SetQueue(gradeQueue(cfg, jobs.TypeInterview, svc.Grade))
	return svc
}

func NewPads(repo *pad.Repo, cfg Config) *pad.Service {
	svc := pad.NewService(repo, grader(cfg))
	svc.SetQueue(gradeQueue(cfg, jobs.TypePad, svc.Grade))
	return svc
}

func grader(cfg Config) *ai.Client {
	return ai.New(cfg.AzureEndpoint, or(cfg.GraderDeployment, cfg.AzureDeployment), cfg.AzureKey, or(cfg.GraderEffort, "high"))
}

// gradeQueue grades inline when no queue is configured, which only suits local runs.
func gradeQueue(cfg Config, typ string, inline jobs.Func) jobs.Queue {
	if cfg.GradeQueueURL == "" {
		return inline
	}
	q, err := jobs.NewSQS(context.Background(), cfg.GradeQueueURL, typ)
	if err != nil {
		log.Printf("grade queue: %v", err)
		return nil
	}
	return q
}

func or(v, fallback string) string {
	if v != "" {
		return v
	}
	return fallback
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
