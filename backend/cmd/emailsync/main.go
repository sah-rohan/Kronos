package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "os"
    "regexp"
    "strings"
    "time"

    "github.com/aws/aws-lambda-go/lambda"
    _ "github.com/jackc/pgx/v5/stdlib"
)

/*
This file contains a Lambda function for the job email sync feature that:
- Opens a Postgres database from PG_DSN.
- Loads active email accounts for users.
- Fetches recent emails for each account (currently a stub).
- Detects job-related emails and classifies them.
- Extracts company and due date information from Online Assessment emails.
- Writes application status rows into the database.

Main functions to read in order:
- main -> handler -> openDB -> loadActiveEmailAccounts -> processEmailAccount -> saveApplicationStatus

This Lambda is meant to run on a schedule from EventBridge, enrich email data, and support the Kronos job dashboard.
*/

// EmailMessage is the simple shape of an email that the Lambda processes.
// It contains only the fields we need for job detection and status extraction.
type EmailMessage struct {
    ID      string    // The email provider's unique message identifier.
    From    string    // The sender address or display name.
    Subject string    // The email subject line.
    Body    string    // The plain text body of the email.
    Date    time.Time // When the email was sent.
}

// EmailAccount represents a connected mail account for a user.
type EmailAccount struct {
    UserID      int    // Local Kronos user identifier.
    Provider    string // e.g. gmail, outlook.
    AccessToken string // OAuth token used to read email.
    Active      bool   // Only active accounts are processed.
}

// ApplicationStatus is the row we want to write into Postgres.
type ApplicationStatus struct {
    UserID       int
    Company      string
    Role         string
    Status       string
    DueDate      sql.NullTime
    SourceEmailID string
}

const (
    StatusOaReceived      = "OA_RECEIVED"
    StatusInterviewInvite = "INTERVIEW_INVITE"
    StatusRejection       = "REJECTION"
    StatusOther           = "OTHER"
)

func main() {
    lambda.Start(handler)
}

// handler is the Lambda entry point.
// EventBridge invokes this on a schedule. The event payload is ignored here
// because this Lambda only needs to run periodically and scan user emails.
func handler(ctx context.Context, event interface{}) error {
    // ctx is the context to timeout database operations if they take too long
    // step 1: open database connection
    db, err := openDB(ctx) // connects to Postgres using PG_DSN
    if err != nil {
        return fmt.Errorf("open db: %w", err) // if it fails, return an error to Lambda so it can retry later
    }
    defer db.Close() // no matter what happens, close the database connection when we're done

    // step 2: load active email accounts from the database
    accounts, err := loadActiveEmailAccounts(ctx, db) // fetches email_accounts rows where active = true
    if err != nil {
        return fmt.Errorf("load email accounts: %w", err) // if it fails, return an error to Lambda so it can retry later
    }

    // step 3: process each active email account
    for _, account := range accounts { // for each active email account, process it
        if err := processEmailAccount(ctx, db, account); err != nil { // fetches new emails, checks if job-related, classifies them, and saves application statuses
            log.Printf("user %d: %v", account.UserID, err) // if an error occurs, log it but continue processing other accounts
        }
    }

    return nil // no error, Lambda will consider this invocation successful
}

// openDB opens a connection pool to Postgres using PG_DSN.
// sql.DB is a pool of connections, not a single database connection.
func openDB(ctx context.Context) (*sql.DB, error) {
    // step 1: get connection string from environment variable
    dsn := os.Getenv("PG_DSN") // read env variable
    if dsn == "" { // check if it's empty
        return nil, fmt.Errorf("PG_DSN is not set") // this prevents trying to connect with no credentials
    }

    // step 2: open a database connection pool object that will be used to connect when needed. This does not actually connect yet.
    db, err := sql.Open("pgx", dsn) // creates a connection pool to Postgres using the pgx driver (dsn is the connection string: username, pass, host, db name, etc.)
    if err != nil { // if opening fails, return an error
        return nil, err
    }

    // step 3: Verify the connection works / verify the database is reachable.
    if err := db.PingContext(ctx); err != nil { // sends a ping to the database to check if it's reachable
        db.Close()
        return nil, err
    }

    // step 4: return the database connection pool to the caller. The caller is responsible for closing it when done.
    return db, nil
}

// loadActiveEmailAccounts fetches the email_accounts rows that are active.
// It returns only the fields we need to process email.
func loadActiveEmailAccounts(ctx context.Context, db *sql.DB) ([]EmailAccount, error) {
    rows, err := db.QueryContext(ctx, `
        select user_id, email_provider, access_token, active
        from email_accounts
        where active = true
    `)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var accounts []EmailAccount
    for rows.Next() {
        var account EmailAccount
        if err := rows.Scan(&account.UserID, &account.Provider, &account.AccessToken, &account.Active); err != nil {
            return nil, err
        }
        accounts = append(accounts, account)
    }
    return accounts, rows.Err()
}

// processEmailAccount handles one user's email account.
// It fetches new emails, finds job-related messages, and saves statuses.
func processEmailAccount(ctx context.Context, db *sql.DB, account EmailAccount) error {
    emails, err := fetchNewEmailsForUser(ctx, account)
    if err != nil {
        return fmt.Errorf("fetch emails: %w", err)
    }

    for _, email := range emails {
        if !isJobEmail(email) {
            continue
        }

        status := classifyEmail(email)
        if status == StatusOther {
            continue
        }

        company := extractCompany(email)
        dueDate, _ := extractDueDate(email)

        st := ApplicationStatus{
            UserID:       account.UserID,
            Company:      company,
            Role:         "",
            Status:       status,
            DueDate:      dueDate,
            SourceEmailID: email.ID,
        }

        if err := saveApplicationStatus(ctx, db, st); err != nil {
            log.Printf("save status user %d email %s: %v", account.UserID, email.ID, err)
        }
    }

    return nil
}

// fetchNewEmailsForUser is a placeholder stub that returns sample emails.
// In a real implementation, this would call Gmail or Outlook APIs using OAuth tokens.
func fetchNewEmailsForUser(ctx context.Context, account EmailAccount) ([]EmailMessage, error) {
    _ = ctx
    _ = account

    // TODO: Replace this stub with real API calls.
    // The real function should use account.AccessToken and account.Provider to
    // list recent messages, fetch their subject/body/from/date/id, and return them.
    return []EmailMessage{
        {
            ID:      "sample-1",
            From:    "no-reply@company.com",
            Subject: "Your Online Assessment is ready",
            Body:    "Hi, please complete your Online Assessment by 08/15/2026.",
            Date:    time.Now().Add(-2 * time.Hour),
        },
        {
            ID:      "sample-2",
            From:    "recruiter@anotherco.com",
            Subject: "Interview Invitation for Software Engineer",
            Body:    "We would like to invite you to interview next week.",
            Date:    time.Now().Add(-24 * time.Hour),
        },
    }, nil
}

// isJobEmail checks whether the email looks related to a job application.
// It uses simple keyword checks in the subject and body.
func isJobEmail(email EmailMessage) bool {
    text := strings.ToLower(email.Subject + " " + email.Body)
    keywords := []string{
        "online assessment",
        "oa",
        "interview",
        "rejection",
        "offer",
        "application",
    }

    for _, keyword := range keywords {
        if strings.Contains(text, keyword) {
            return true
        }
    }
    return false
}

// classifyEmail returns one of the top-level job email categories.
// This is a simple keyword-based classifier and can be upgraded later.
func classifyEmail(email EmailMessage) string {
    text := strings.ToLower(email.Subject + " " + email.Body)

    if strings.Contains(text, "online assessment") || strings.Contains(text, "oa") {
        return StatusOaReceived
    }
    if strings.Contains(text, "interview") || strings.Contains(text, "panel") {
        return StatusInterviewInvite
    }
    if strings.Contains(text, "rejected") || strings.Contains(text, "regret") || strings.Contains(text, "not selected") {
        return StatusRejection
    }
    return StatusOther
}

// extractCompany uses a simple heuristic to guess the company name.
// It checks the sender address and the subject line.
func extractCompany(email EmailMessage) string {
    cleanedFrom := strings.TrimSpace(strings.Split(email.From, "<")[0])
    if cleanedFrom != "" && cleanedFrom != email.From {
        return cleanedFrom
    }

    subject := strings.ToLower(email.Subject)
    patterns := []string{" at ", " from ", " for "}
    for _, pat := range patterns {
        if idx := strings.Index(subject, pat); idx != -1 {
            candidate := strings.TrimSpace(email.Subject[idx+len(pat):])
            if candidate != "" {
                return candidate
            }
        }
    }

    // Fallback to the raw sender or subject when we cannot parse a company.
    if email.From != "" {
        return email.From
    }
    return email.Subject
}

var datePattern = regexp.MustCompile(`(?i)(\b\d{1,2}/\d{1,2}/\d{2,4}\b)|(\b\d{4}-\d{1,2}-\d{1,2}\b)`) // MM/DD/YYYY or YYYY-MM-DD

// extractDueDate looks for a simple date pattern in the email text.
// It returns sql.NullTime so we can store NULL in the database when no date is found.
func extractDueDate(email EmailMessage) (sql.NullTime, error) {
    text := email.Subject + " " + email.Body
    match := datePattern.FindString(text)
    if match == "" {
        return sql.NullTime{Valid: false}, nil
    }

    layouts := []string{"1/2/2006", "01/02/2006", "2006-01-02"}
    for _, layout := range layouts {
        if due, err := time.Parse(layout, match); err == nil {
            return sql.NullTime{Time: due, Valid: true}, nil
        }
    }

    return sql.NullTime{Valid: false}, nil
}

// saveApplicationStatus inserts or updates a row in application_statuses.
// It uses ON CONFLICT to avoid duplicate rows for the same email message.
func saveApplicationStatus(ctx context.Context, db *sql.DB, status ApplicationStatus) error {
    _, err := db.ExecContext(ctx, `
        insert into application_statuses
            (user_id, company, role, status, due_date, source_email_id, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, now(), now())
        on conflict (user_id, source_email_id) do update set
            company = excluded.company,
            role = excluded.role,
            status = excluded.status,
            due_date = excluded.due_date,
            updated_at = now()
    `,
        status.UserID,
        status.Company,
        nullString(status.Role),
        status.Status,
        status.DueDate,
        status.SourceEmailID,
    )
    return err
}

// nullString converts a string to sql.NullString.
// This makes it easier to store nullable text columns in Postgres.
func nullString(value string) sql.NullString {
    if strings.TrimSpace(value) == "" {
        return sql.NullString{Valid: false}
    }
    return sql.NullString{String: value, Valid: true}
}
