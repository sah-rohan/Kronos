package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"kronos/internal/ai"
	"kronos/internal/platform/httpx"
)

// Local-only harness for the AI routes: the real controller and service, with
// no Clerk token and no database. Binds to loopback because it has no auth.
func main() {
	svc := ai.NewService(ai.Config{
		Endpoint:   os.Getenv("AZURE_OPENAI_ENDPOINT"),
		Deployment: os.Getenv("AZURE_OPENAI_DEPLOYMENT"),
	})
	if !svc.Enabled() {
		log.Fatal("AZURE_OPENAI_ENDPOINT is not set")
	}
	controller := ai.NewController(svc)

	addr := "127.0.0.1:" + envOr("PORT", "8080")
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))

		resp, handled, err := controller.Route(&httpx.Request{
			Method: r.Method,
			Path:   r.URL.Path,
			Parts:  httpx.Segments(r.URL.Path),
			Body:   string(body),
			Query:  flatten(r.URL.Query()),
		})
		switch {
		case err != nil:
			http.Error(w, err.Error(), 500)
			return
		case !handled:
			http.Error(w, "not found", 404)
			return
		}

		for k, v := range resp.Headers {
			w.Header().Set(k, v)
		}
		w.WriteHeader(resp.StatusCode)
		fmt.Fprint(w, resp.Body)
		log.Printf("%s %s -> %d", r.Method, r.URL.Path, resp.StatusCode)
	})

	log.Printf("listening on http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func flatten(q map[string][]string) map[string]string {
	out := make(map[string]string, len(q))
	for k, v := range q {
		if len(v) > 0 {
			out[k] = v[0]
		}
	}
	return out
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
