// Package httpx carries the HTTP plumbing every feature controller shares:
// the parsed request, the JSON/CORS response helpers, and the Controller
// interface the router dispatches through.
//
// Feature controllers depend on this package; this package depends on no
// feature, so adding a feature never touches the plumbing.
package httpx

import (
	"encoding/json"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"

	"kronos/internal/domain"
)

type Response = events.APIGatewayV2HTTPResponse

// Request is one authenticated call, parsed once by the router so each
// controller matches on fields instead of re-splitting the path.
type Request struct {
	Method string
	Path   string
	Parts  []string // path split on "/", e.g. ["me","sd","url-shortener"]
	Body   string
	Query  map[string]string
	User   domain.User
}

// Controller is one feature's slice of the HTTP surface. Route reports
// handled=false when the request isn't its business, letting the router try
// the next feature. Adding a feature means adding a Controller, nothing else.
type Controller interface {
	Route(r *Request) (Response, bool, error)
}

// Is matches a method and exact path.
func (r *Request) Is(method, path string) bool {
	return r.Method == method && r.Path == path
}

// Match matches a method and a path shape, where "*" is a wildcard segment:
//
//	r.Match("GET", "friends", "*", "progress")
func (r *Request) Match(method string, shape ...string) bool {
	if r.Method != method || len(r.Parts) != len(shape) {
		return false
	}
	for i, want := range shape {
		if want != "*" && r.Parts[i] != want {
			return false
		}
	}
	return true
}

// Decode unmarshals the JSON body into v, ignoring errors the way the previous
// handlers did: a malformed body yields the zero value, and the validation
// that follows rejects it.
func (r *Request) Decode(v any) { _ = json.Unmarshal([]byte(r.Body), v) }

// Segments splits a URL path into its non-empty components.
func Segments(path string) []string {
	return strings.FieldsFunc(path, func(c rune) bool { return c == '/' })
}

func corsHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "authorization,content-type",
		"Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
	}
}

// Reply serializes body as JSON with the CORS headers every response carries.
func Reply(status int, body any) (Response, error) {
	headers := corsHeaders()
	if body == nil {
		return Response{StatusCode: status, Headers: headers}, nil
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return Response{StatusCode: 500, Headers: headers}, nil
	}
	return Response{StatusCode: status, Headers: headers, Body: string(payload)}, nil
}

// Raw returns an already-encoded JSON body, for responses proxied verbatim
// from an upstream service.
func Raw(status int, body []byte) (Response, error) {
	return Response{StatusCode: status, Headers: corsHeaders(), Body: string(body)}, nil
}

// Error replies with a JSON {"error": msg} at the given status.
func Error(status int, msg string) (Response, error) {
	return Reply(status, map[string]string{"error": msg})
}

// ServerError logs the real cause and returns an opaque 500, so internals
// never reach the client.
func ServerError(err error) (Response, error) {
	log.Printf("server error: %v", err)
	return Error(500, "internal error")
}

// NotFound is the router's fallthrough when no controller claims a request.
func NotFound() (Response, error) { return Error(404, "not found") }

// Data replies 200 with data, or 500 if the lookup failed.
func Data(data any, err error) (Response, error) {
	if err != nil {
		return ServerError(err)
	}
	return Reply(200, data)
}

// OK replies {"ok":true}, or 500 if the write failed.
func OK(err error) (Response, error) {
	if err != nil {
		return ServerError(err)
	}
	return Reply(200, map[string]bool{"ok": true})
}

// Handled is sugar for a controller returning a completed response.
func Handled(resp Response, err error) (Response, bool, error) { return resp, true, err }

// Pass reports that this controller does not serve the request.
func Pass() (Response, bool, error) { return Response{}, false, nil }
