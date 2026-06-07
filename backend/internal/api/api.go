package api

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/clerk/clerk-sdk-go/v2/jwt"

	"kronos/internal/store"
)

type API struct {
	Store        *store.Postgres
	AdminClerkID string
}

type request = events.APIGatewayV2HTTPRequest
type response = events.APIGatewayV2HTTPResponse

func (a *API) Handle(ctx context.Context, req request) (response, error) {
	method := req.RequestContext.HTTP.Method
	path := req.RawPath

	if method == "OPTIONS" {
		return reply(204, nil)
	}

	clerkID, ok := authenticate(ctx, req)
	if !ok {
		return reply(401, map[string]string{"error": "unauthorized"})
	}

	user, err := a.Store.EnsureUser(ctx, clerkID, displayName(req))
	if err != nil {
		return reply(500, map[string]string{"error": err.Error()})
	}

	if a.AdminClerkID != "" && clerkID == a.AdminClerkID &&
		(user.Role != "admin" || user.Status != "approved") {
		if err := a.Store.MakeAdmin(ctx, user.ID); err == nil {
			user.Role = "admin"
			user.Status = "approved"
		}
	}

	if method == "GET" && path == "/me" {
		return reply(200, user)
	}

	if method == "POST" && path == "/me/profile" {
		var in struct {
			Username string `json:"username"`
			Github   string `json:"github"`
		}
		json.Unmarshal([]byte(req.Body), &in)
		if err := a.Store.SetProfile(ctx, user.ID, in.Username, in.Github); err != nil {
			if errors.Is(err, store.ErrUsernameTaken) {
				return reply(409, map[string]string{"error": "username taken"})
			}
			return reply(500, map[string]string{"error": err.Error()})
		}
		return reply(200, map[string]bool{"ok": true})
	}

	if user.Role == "admin" && strings.HasPrefix(path, "/admin/") {
		return a.admin(ctx, method, path, req.Body)
	}

	if user.Status != "approved" {
		return reply(403, map[string]string{"error": "pending approval"})
	}

	return a.member(ctx, method, path, user, req.Body, req.QueryStringParameters)
}

func (a *API) member(ctx context.Context, method, path string, user store.User, body string, query map[string]string) (response, error) {
	parts := segments(path)

	switch {
	case method == "POST" && path == "/me/theme":
		var in struct {
			Theme string `json:"theme"`
		}
		json.Unmarshal([]byte(body), &in)
		return okOrError(a.Store.SetTheme(ctx, user.ID, in.Theme))

	case method == "GET" && path == "/me/progress":
		rows, err := a.Store.Progress(ctx, user.ID)
		return dataOrError(rows, err)

	case method == "GET" && path == "/me/calendar":
		rows, err := a.Store.Calendar(ctx, user.ID)
		return dataOrError(rows, err)

	case method == "GET" && len(parts) == 3 && parts[0] == "me" && parts[1] == "problem":
		rows, err := a.Store.MySolution(ctx, user.ID, parts[2], query["recent"] == "1")
		return dataOrError(rows, err)

	case method == "GET" && path == "/leaderboard":
		rows, err := a.Store.Leaderboard(ctx, 100)
		return dataOrError(rows, err)

	case method == "GET" && path == "/recent":
		rows, err := a.Store.Recent(ctx, 25)
		return dataOrError(rows, err)

	case method == "GET" && path == "/group/difficulty":
		rows, err := a.Store.GroupDifficulty(ctx)
		return dataOrError(rows, err)

	case method == "GET" && path == "/friends":
		rows, err := a.Store.Friends(ctx, user.ID)
		return dataOrError(rows, err)

	case method == "POST" && path == "/friends":
		var in struct{ Username string `json:"username"` }
		json.Unmarshal([]byte(body), &in)
		if err := a.Store.AddFriend(ctx, user.ID, in.Username); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return reply(404, map[string]string{"error": "no approved user with that username"})
			}
			return reply(500, map[string]string{"error": err.Error()})
		}
		return reply(200, map[string]bool{"ok": true})

	case method == "DELETE" && len(parts) == 2 && parts[0] == "friends":
		if err := a.Store.RemoveFriend(ctx, user.ID, parts[1]); err != nil {
			return reply(500, map[string]string{"error": err.Error()})
		}
		return reply(200, map[string]bool{"ok": true})

	case method == "GET" && len(parts) == 3 && parts[0] == "friends" && parts[2] == "progress":
		rows, err := a.Store.FriendProgress(ctx, user.ID, parts[1])
		if errors.Is(err, store.ErrNotFound) {
			return reply(404, map[string]string{"error": "not a friend"})
		}
		return dataOrError(rows, err)

	case method == "GET" && len(parts) == 4 && parts[0] == "friends" && parts[2] == "problem":
		sol, err := a.Store.FriendSolution(ctx, user.ID, parts[1], parts[3])
		if errors.Is(err, store.ErrNotFound) {
			return reply(404, map[string]string{"error": "no solution"})
		}
		return dataOrError(sol, err)
	}

	return reply(404, map[string]string{"error": "not found"})
}

func (a *API) admin(ctx context.Context, method, path, body string) (response, error) {
	parts := segments(path)

	switch {
	case method == "GET" && path == "/admin/pending":
		users, err := a.Store.ListPending(ctx)
		return dataOrError(users, err)

	case method == "POST" && path == "/admin/approve":
		var in struct{ ID string `json:"id"` }
		json.Unmarshal([]byte(body), &in)
		return okOrError(a.Store.Approve(ctx, in.ID))

	case method == "POST" && path == "/admin/username":
		var in struct {
			ID       string `json:"id"`
			Username string `json:"username"`
		}
		json.Unmarshal([]byte(body), &in)
		if err := a.Store.SetUsername(ctx, in.ID, in.Username); err != nil {
			if errors.Is(err, store.ErrUsernameTaken) {
				return reply(409, map[string]string{"error": "username taken"})
			}
			return reply(500, map[string]string{"error": err.Error()})
		}
		return reply(200, map[string]bool{"ok": true})

	case method == "DELETE" && len(parts) == 3 && parts[0] == "admin" && parts[1] == "users":
		return okOrError(a.Store.DeleteUser(ctx, parts[2]))
	}

	return reply(404, map[string]string{"error": "not found"})
}

func authenticate(ctx context.Context, req request) (string, bool) {
	header := req.Headers["authorization"]
	if header == "" {
		header = req.Headers["Authorization"]
	}
	token := strings.TrimPrefix(header, "Bearer ")
	if token == "" {
		return "", false
	}
	claims, err := jwt.Verify(ctx, &jwt.VerifyParams{Token: token})
	if err != nil {
		return "", false
	}
	return claims.Subject, true
}

func displayName(req request) string {
	return strings.TrimSpace(req.QueryStringParameters["name"])
}

func segments(path string) []string {
	return strings.FieldsFunc(path, func(r rune) bool { return r == '/' })
}

func dataOrError(data any, err error) (response, error) {
	if err != nil {
		return reply(500, map[string]string{"error": err.Error()})
	}
	return reply(200, data)
}

func okOrError(err error) (response, error) {
	if err != nil {
		return reply(500, map[string]string{"error": err.Error()})
	}
	return reply(200, map[string]bool{"ok": true})
}

func reply(status int, body any) (response, error) {
	headers := map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "authorization,content-type",
		"Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
	}
	if body == nil {
		return response{StatusCode: status, Headers: headers}, nil
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return response{StatusCode: 500, Headers: headers}, nil
	}
	return response{StatusCode: status, Headers: headers, Body: string(payload)}, nil
}
