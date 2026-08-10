package api

import (
      "context"
      "strconv"
      "time"

      "kronos/internal/store"
)

// getJobs serves GET /jobs for the Job Board dashboard card, one page at a
// time. The frontend sends ?limit=20, and after the first page, &beforeId=
// &beforeTime= copied from the previous response's nextCursor. jobsync (a
// separate scheduled Lambda) is the only thing that ever writes to the
// `jobs` table this reads from.
func (a *API) getJobs(ctx context.Context, query map[string]string) (response, error) {
      // Default page size if the frontend doesn't specify one.
      limit := 20
      if v := query["limit"]; v != "" {
              if n, err := strconv.Atoi(v); err == nil && n > 0 {
                      limit = n
              }
      }

      // query["beforeId"] is "" if that key isn't in the URL at all - which is
      // exactly what we want to mean "no cursor yet, send me the first page."
      beforeID := query["beforeId"]
      var beforeTime time.Time
      if v := query["beforeTime"]; v != "" {
              if t, err := time.Parse(time.RFC3339, v); err == nil {
                      beforeTime = t
              }
      }

      rows, err := a.Store.Jobs(ctx, limit, beforeID, beforeTime)
      if err != nil {
              return serverError(err)
      }

      // cursor is only ever used inside this one response, so it's declared
      // right here instead of as a package-level type.
      type cursor struct {
              BeforeID   string    `json:"beforeId"`
              BeforeTime time.Time `json:"beforeTime"`
      }

      // If we got back a full page (exactly `limit` rows), there might be
      // more - point the frontend at the last row we just sent. If we got back
      // fewer than `limit`, we've reached the actual end of the list.
      var next *cursor
      if len(rows) == limit {
              last := rows[len(rows)-1]
              next = &cursor{BeforeID: last.ID, BeforeTime: last.FirstSeenAt}
      }

      return reply(200, struct {
              Jobs       []store.JobRow `json:"jobs"`
              NextCursor *cursor        `json:"nextCursor"`
      }{Jobs: rows, NextCursor: next})
}