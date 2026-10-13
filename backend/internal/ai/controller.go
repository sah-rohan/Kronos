package ai

import (
	"context"
	"encoding/json"
	"errors"

	"kronos/internal/platform/httpx"
)

type Controller struct {
	svc *Service
}

func NewController(svc *Service) *Controller { return &Controller{svc: svc} }

type reviewInput struct {
	Design json.RawMessage `json:"design"`
}

func (c *Controller) Route(r *httpx.Request) (httpx.Response, bool, error) {
	// POST /me/sd/{slug}/review
	if !r.Match("POST", "me", "sd", "*", "review") {
		return httpx.Pass()
	}

	var in reviewInput
	r.Decode(&in)

	review, err := c.svc.ReviewDesign(context.Background(), r.Parts[2], string(in.Design))
	switch {
	case errors.Is(err, ErrDisabled):
		return httpx.Handled(httpx.Error(503, "ai review is not configured"))
	case errors.Is(err, ErrBadInput):
		return httpx.Handled(httpx.Error(400, "bad design payload"))
	}
	return httpx.Handled(httpx.Data(review, err))
}
