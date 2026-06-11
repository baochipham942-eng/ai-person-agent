# Organization Review Apply

Generated at: 2026-06-10T11:25:33.821Z
Mode: execute
Input: docs/audit-2026-06/data/org_review_decisions_2026_06_10.json
Archive: docs/audit-2026-06/data/org_review_first_archive.json

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 10 |
| merge decisions | 7 |
| keep decisions | 3 |
| member organizations deleted | 7 |
| PersonRole rows repointed | 9 |
| duplicate PersonRole rows deleted | 0 |
| People.organization rows updated | 7 |

## Decisions

| Action | Canonical / Cluster | Members | Role changes | People labels | Reason |
| --- | --- | ---: | ---: | ---: | --- |
| merge_organization | Stanford University | 1 | 3 | 2 | Chinese duplicate row for Stanford University; keep labs, departments, HAI, SAIL, CRFM and professorship rows separate for now. |
| merge_organization | Carnegie Mellon University | 1 | 1 | 4 | Chinese duplicate row for Carnegie Mellon University; keep CMU CSD, NeuLab and school rows separate for now. |
| merge_organization | Meta | 1 | 1 | 0 | Meta (Facebook) is a direct alias for the current Meta organization row; keep Facebook, FAIR, Meta AI, MetaMind and Metaweb separate. |
| merge_organization | Institute of Computing Technology, Chinese Academy of Sciences (CAS ICT) | 1 | 1 | 1 | Two English CAS ICT variants refer to the same institute for Chen Tianshi; keep other CAS institutes and parent academy separate. |
| merge_organization | Dalle Molle Institute for Artificial Intelligence Research | 1 | 1 | 0 | Dalle Molle Institute for Artificial Intelligence Research and IDSIA-suffixed variant are the same organization. |
| merge_organization | IBM | 1 | 1 | 0 | Chinese full corporate-name row is an IBM duplicate; keep IBM Research separate as a research suborganization. |
| merge_organization | King's College, Cambridge | 1 | 1 | 0 | Geoffrey Hinton's short King's College row resolves to King's College, Cambridge; keep King's College, New Zealand separate. |
| keep_separate | nyu_suborgs | 0 | 0 | 0 | Keep New York University, NYU Courant and Tandon separate until the display rule for schools and institutes is explicit. |
| keep_separate | twitter_x_history | 0 | 0 | 0 | Keep Twitter, X Corp. and X.com separate because historical employment and acquisition context differ. |
| keep_separate | ubc | 0 | 0 | 0 | Keep SBS & University of British Columbia separate from University of British Columbia until the SBS context is verified. |
