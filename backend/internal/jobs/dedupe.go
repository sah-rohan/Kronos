package jobs

// Deduplication: collapsing rows that newID decided are the same posting.
//
// Canonicalization alone changes nothing a user can see. It only makes two
// spellings of one job hash to the same ID; without this pass both rows are
// still in the slice, so the dashboard still renders the job twice - now with
// duplicate React keys as a bonus. This file is the half that actually
// removes them.

// Dedupe collapses jobs sharing an ID into one record, merging their fields,
// and returns the result in first-seen order.
//
// Ordering is the subtle part. The obvious implementation - group everything
// into a map, then range over the map to build the output - is broken here,
// because Go deliberately randomizes map iteration order. The list would come
// out shuffled differently on every scrape, and GET /jobs pages it with plain
// offsets: a reader who fetched offset=0 before a re-scrape and offset=20
// after would see some jobs twice and miss others entirely. So the map here
// only ever holds indexes into the output slice; the slice itself is built by
// walking the input in order, which makes the result stable as long as the
// sources are.
//
// Which record wins is therefore decided by input order. The caller
// concatenates speedyapply before simplifyjobs, so speedyapply is the primary
// source - a deliberate choice, since it's the one carrying salary data.
func Dedupe(all []Job) []Job {
	out := make([]Job, 0, len(all))
	indexByID := make(map[string]int, len(all))

	for _, job := range all {
		// An empty ID means newID had nothing usable to work with. Keeping
		// such rows separate is the safe reading: collapsing them all into
		// one entry would hide real postings.
		if job.ID == "" {
			out = append(out, job)
			continue
		}

		if i, seen := indexByID[job.ID]; seen {
			out[i] = mergeJobs(out[i], job)
			continue
		}

		indexByID[job.ID] = len(out)
		out = append(out, job)
	}

	return out
}

// mergeJobs folds a duplicate into the record already kept for that ID.
//
// Merging rather than discarding the duplicate is worth the effort because
// the two sources carry different data: speedyapply lists salary, SimplifyJobs
// usually doesn't. Collapsing them produces a more complete row than either
// source had alone, so dedup doubles as enrichment.
//
// primary wins every field it has a value for; secondary only fills blanks.
// Closed is the one exception - see below.
func mergeJobs(primary, secondary Job) Job {
	merged := primary

	merged.Company = firstNonEmpty(primary.Company, secondary.Company)
	merged.Position = firstNonEmpty(primary.Position, secondary.Position)
	merged.Location = firstNonEmpty(primary.Location, secondary.Location)
	merged.Salary = firstNonEmpty(primary.Salary, secondary.Salary)
	merged.PostingURL = firstNonEmpty(primary.PostingURL, secondary.PostingURL)
	merged.Age = firstNonEmpty(primary.Age, secondary.Age)
	merged.SourceRepo = firstNonEmpty(primary.SourceRepo, secondary.SourceRepo)
	merged.SourceSection = firstNonEmpty(primary.SourceSection, secondary.SourceSection)

	// A posting counts as closed only when every source agrees it is. One
	// repo lagging behind on marking a role closed is common; the cost of
	// trusting the stale "open" is a dead link, while the cost of trusting a
	// stale "closed" is hiding a job someone could still have applied to.
	merged.Closed = primary.Closed && secondary.Closed

	return merged
}

// firstNonEmpty returns a if it has content, otherwise b.
func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
