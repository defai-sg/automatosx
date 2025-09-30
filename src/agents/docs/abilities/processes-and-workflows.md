# Technical Documentation Processes and Workflows

## Documentation Lifecycle
1. **Intake & Scoping**: Capture feature briefs, personas, success metrics, and release timelines in the docs backlog.
2. **Research & Enablement**: Interview SMEs, review design artifacts, run product walkthroughs, gather support data.
3. **Information Architecture**: Define topic clusters, navigation paths, metadata/tags, and cross-linking plan.
4. **Drafting & Prototyping**: Produce outlines, task-based procedures, visuals, and sample payloads in the docs-as-code repo.
5. **Review & Validation**: Run automated linting, code sample verification, SME/QA review cycles, legal/compliance sign-off.
6. **Publish & Communicate**: Merge to main, trigger CI publishing, update release notes, broadcast to stakeholders.
7. **Measure & Iterate**: Analyse search queries, deflection metrics, page analytics; capture feedback for backlog grooming.

## API & Developer Doc Workflow
- **Contract Alignment**: Sync with OpenAPI/GraphQL schemas, generate reference scaffolding, verify versioning strategy.
- **Sample Management**: Build runnable snippets, test via Postman/CLI, ensure error scenarios are covered.
- **Tutorial Creation**: Craft end-to-end guides, diagram flows, include troubleshooting checkpoints, embed analytics.
- **Release Governance**: Track backwards compatibility, deprecation notices, and changelog automation.

## Review & Quality Assurance
- **Docs QA Checklist**: Style linting (Vale), accessibility checks, link validation, image optimisation.
- **SME Review Cadence**: Async PR reviews with targeted prompts, approval gates, feedback SLA monitoring.
- **Proofreading & Localization**: Editorial review, terminology validation, translation handoff packages, locale QA.
- **Post-Publication Audit**: 7/30/90-day freshness checks, support ticket correlation, customer feedback loops.

## Collaboration Touchpoints
- **Sprint Rituals**: Attend planning/grooming for upcoming stories, flag documentation dependencies early.
- **Release Readiness**: Coordinate with PM/engineering on release notes, cutover plans, enablement sessions.
- **Support & Success Syncs**: Review ticket trends, create macro templates, maintain FAQ updates.
- **Marketing & Legal Liaison**: Align on messaging, compliance disclaimers, brand tone, and approvals.

## Knowledge Operations & Continuous Improvement
- **Content Governance**: Quarterly audits, content owner matrix, sunset protocol, archival tagging.
- **Analytics Reviews**: Monthly dashboards on search exits, dwell time, task success proxies, doc coverage ratio.
- **Process Retrospectives**: Identify toolchain friction, doc debt hotspots, training needs, automation candidates.
- **Education & Enablement**: Docs onboarding curriculum, SME writing workshops, docs-as-code playbooks, office hours.

## Incident & Hotfix Handling
1. **Detection**: Alerts from CI, customer reports, support tickets, or monitoring dashboards.
2. **Triaging**: Classify severity, assign owner, create hotfix branch, notify stakeholders.
3. **Correction**: Update content, verify against latest build, run sanity checks, secure urgent approvals.
4. **Publishing**: Fast-track merge, hotfix deploy, communicate to affected teams/customers.
5. **Postmortem**: Document root cause, prevention steps, backlog updates, metrics impact.
