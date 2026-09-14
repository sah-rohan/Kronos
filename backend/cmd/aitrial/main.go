package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"kronos/internal/ai"
)

func main() {
	svc := ai.NewService(ai.Config{
		Endpoint:   os.Getenv("AZURE_OPENAI_ENDPOINT"),
		Deployment: os.Getenv("AZURE_OPENAI_DEPLOYMENT"),
	})
	if !svc.Enabled() {
		log.Fatal("AZURE_OPENAI_ENDPOINT is not set")
	}

	prompt := "Reply with exactly: forge is wired into kronos"
	if len(os.Args) > 1 {
		prompt = strings.Join(os.Args[1:], " ")
	}

	start := time.Now()
	text, err := svc.Ask(context.Background(), prompt)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%dms\n\n%s\n", time.Since(start).Milliseconds(), text)
}
