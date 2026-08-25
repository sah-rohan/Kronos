package api

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

// authenticate verifies the Clerk bearer token and returns its subject. It is
// the only place a token is trusted; everything downstream works from the
// resolved domain.User.
func authenticate(ctx context.Context, req events.APIGatewayV2HTTPRequest) (string, bool) {
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

// displayName and userEmail come from query parameters the client attaches, so
// a first-time sign-in can be stored with a name and address. They are treated
// as hints, never as identity - the Clerk subject is the identity.
func displayName(req events.APIGatewayV2HTTPRequest) string {
	return strings.TrimSpace(req.QueryStringParameters["name"])
}

func userEmail(req events.APIGatewayV2HTTPRequest) string {
	return strings.TrimSpace(req.QueryStringParameters["email"])
}
