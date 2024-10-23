---
name: Release checklist
about: The process for making a new release
title: Release VERSION
labels: ""
assignees: ""
---

<!--
NOTE TO RELEASE CAPTAINS:

When filing this issue, replace VERSION and MILESTONE placeholders with the
correct values in all fields.
-->

Welcome Release Captain ! ⛵️

- [ ] Assign this issue to yourself
- [ ] Check the [VERSION milestone](https://github.com/mozilla-extensions/nimbus-devtools/milestone/MILESTONE)
  - Any open issues (except this one) should be moved into a future milestone.
- [ ] Check out the main branch: `git checkout main`
- [ ] Check the following files have the expected version:
  - `package.json`
  - `web-ext-config.json`

  If they don't, update them in a separate PR.

- [ ] Create a tag for this release:

```sh
git tag release/vVERSION # e.g., release/v0.1.0
git push origin --tags
```

- [ ] Fill out the [Mozilla Add On Review Request Intake Form][add-on-intake-form]:
  1. Submit a review request for an updated add-on

     1. Fill in the following fields:

        - **Summary**: Updated Add-on Review Request nimbus-devtools VERSION
        - **Add-on name**: nimbus-devtools
        - **Add-on version**: VERSION
        - **Specific repository commit to review and release:**
          https://github.com/mozilla-extensions/nimbus-devtools/tree/release/vVERSION
        - **Release schedule for this submission:** when available
        - **Intended distrbution (AMO or Self-hosted):** self-hosted (github release)
    
     1. Remove or strike-out unchanged fields (description, add-on owner, etc.)
     1. Remove or strike-out all badging options except "No badging"
  2. Flag someone from the security team in a comment the created JIRA ticket to ask for a security
     review.
  3. Link the JIRA ticket here in a comment

- [ ] Once the security review has finished and the add-on is released, you can edit the new GitHub
      release. Update the release with a name (nimbus-devtools vVERSION) .

- [ ] Create a milestone for the next release.
- [ ] Close this issue and the milestone.

[add-on-intake-form]: https://mozilla-hub.atlassian.net/wiki/spaces/FDPDT/pages/10617933/Mozilla+Add-on+Review+Requests+Intake
