package main

import (
    "context"
    "log"

    "github.com/aws/aws-lambda-go/lambda"

    "kronos/internal/config"
    "kronos/internal/jobs"
    "kronos/internal/store"
)

// sources defines which repos to scrape and how to label/parse each section.
var sources = []struct {
    owner         string
    repo          string
    source        string
    sectionHeader string // "" = parse first table found
}{
    {"speedyapply", "2027-SWE-College-Jobs", "speedyapply", ""},
    {"SimplifyJobs", "New-Grad-Positions", "simplify-swe", "software engineering"},
    {"SimplifyJobs", "New-Grad-Positions", "simplify-pm", "product management"},
}

func handler(ctx context.Context) error {
    db, err := store.NewPostgres(ctx, config.Get(ctx, "DATABASE_URL"))
    if err != nil {
        return err
    }
    defer db.Close()

    ghToken := config.Get(ctx, "GITHUB_TOKEN") // optional, can be empty
    client := jobs.NewGitHubClient(ghToken)

    // Cache the README per repo to avoid fetching SimplifyJobs twice.
    readmeCache := map[string]string{}

    for _, s := range sources {
        key := s.owner + "/" + s.repo
        markdown, ok := readmeCache[key]
        if !ok {
            var fetchErr error
            markdown, fetchErr = client.FetchREADME(ctx, s.owner, s.repo)
            if fetchErr != nil {
                log.Printf("fetch %s: %v", key, fetchErr)
                continue
            }
            readmeCache[key] = markdown
        }

        parsed := jobs.ParseTable(markdown, s.source, s.sectionHeader)
        log.Printf("parsed %d jobs from %s (section: %q)", len(parsed), key, s.sectionHeader)

        for _, j := range parsed {
            if err := db.InsertJobListing(ctx, store.JobListingInput{
                Source:   j.Source,
                Company:  j.Company,
                Role:     j.Role,
                Location: j.Location,
                ApplyURL: j.ApplyURL,
                Posted:   j.Posted,
                IsOpen:   j.IsOpen,
            }); err != nil {
                log.Printf("insert job %s/%s: %v", j.Company, j.Role, err)
            }
        }
    }
    return nil
}

func main() {
    lambda.Start(handler)
}
