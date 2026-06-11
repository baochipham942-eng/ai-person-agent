# Organization Review Apply

Generated at: 2026-06-10T12:24:39.247Z
Mode: dry-run
Input: docs/audit-2026-06/data/org_review_decisions_second_2026_06_10.json
Archive: docs/audit-2026-06/data/org_review_second_dry_run_archive.json

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 12 |
| merge decisions | 2 |
| label rewrite decisions | 1 |
| keep decisions | 9 |
| member organizations to delete | 2 |
| PersonRole rows to repoint | 2 |
| duplicate PersonRole rows to delete | 0 |
| People.organization rows to update | 6 |

## Decisions

| Action | Canonical / Cluster | Members | Role changes | People labels | Reason |
| --- | --- | ---: | ---: | ---: | --- |
| merge_organization | Stanford HAI | 1 | 1 | 0 | Stanford HAI and Stanford Institute for Human-Centered Artificial Intelligence (HAI) refer to the same Stanford center; keep other Stanford departments, labs, and university-level rows separate. |
| merge_organization | Stanford University | 1 | 1 | 0 | Stanford University, Sequoia Professor is a position-bearing Stanford role, not a distinct organization; repoint the endowed-chair role to Stanford University. |
| rewrite_people_organization_labels | facebook_meta_history | 0 | 0 | 6 | Normalize People.organization display labels to canonical English organization names while keeping Facebook, FAIR, Meta AI, MetaMind, Metaweb, and Meta Superintelligence Labs separate. |
| keep_separate | stanford_suborgs | 0 | 0 | 0 | Keep Stanford University, Stanford Computer Science Department, SAIL, Stanford HAI, Stanford Digital Economy Lab, CRFM, and Stanford Vision Lab as separate displayable affiliations. |
| keep_separate | nyu_suborgs | 0 | 0 | 0 | Keep New York University, NYU Courant, and NYU Tandon separate because university, institute, and school-level affiliations carry different display meaning. |
| keep_separate | cmu_suborgs | 0 | 0 | 0 | Keep Carnegie Mellon University, CMU Computer Science Department, and NeuLab @ LTI/CMU separate because school/lab affiliations are more specific than the parent university. |
| keep_separate | facebook_meta_history | 0 | 0 | 0 | Keep Facebook, Meta, Facebook AI Research (FAIR), Meta AI, MetaMind, Metaweb, and Meta Superintelligence Labs separate because they represent different historical employers, labs, products, or teams. |
| keep_separate | twitter_x_history | 0 | 0 | 0 | Keep Twitter, Twitter/X transition rows, X Corp., and X.com separate because historical roles and acquisition/founding context differ. |
| keep_separate | cas_ict | 0 | 0 | 0 | Keep CAS ICT, CAS Graduate School, Institute of Biophysics, Institute of Software, parent Chinese Academy of Sciences, and the automation institute lab separate. |
| keep_separate | ibm_research | 0 | 0 | 0 | Keep IBM and IBM Research separate because corporate leadership roles and research-lab affiliations are distinct. |
| keep_separate | ubc | 0 | 0 | 0 | Keep SBS & University of British Columbia separate from University of British Columbia until the SBS context has direct source support. |
| keep_separate | kings_college | 0 | 0 | 0 | Keep King's College, Cambridge and King's College, New Zealand separate because they are different institutions. |
