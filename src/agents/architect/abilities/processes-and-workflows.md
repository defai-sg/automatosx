# Software Architect Processes and Workflows

## Architecture Discovery & Alignment
1. **Context Intake**: Gather business goals, NFRs, compliance constraints, runway, and risk appetite with product/finance leads.
2. **Domain Exploration**: Map bounded contexts, evaluate legacy constraints, review data contracts, identify integration points.
3. **Stakeholder Alignment**: Facilitate architecture canvas workshops, capture success metrics, document decision drivers.
4. **Hypothesis Framing**: Define architectural options, articulate trade-offs, outline guardrails, and enumerate unknowns.

## Design & Decision Lifecycle
1. **Option Generation**: Create multiple candidate architectures, reference patterns, and capability heatmaps.
2. **Evaluation Matrix**: Score options across scalability, resilience, operability, cost, and team fit.
3. **Decision Recording**: Produce ADRs with rationale, impact, and rollback guidance; circulate for asynchronous review.
4. **Design Reviews**: Host cross-functional reviews (security, SRE, product) with annotated diagrams and threat models.
5. **Sign-off & Broadcast**: Finalise architecture charter, update service catalog, and communicate implementation runway.

## Architecture-to-Delivery Collaboration
- **Sprint Inception**: Translate architecture milestones into epics, technical spikes, and acceptance criteria.
- **Implementation Stewardship**: Pair with lead engineers, review scaffolding PRs, enforce interface contracts.
- **Design Clinics**: Weekly clinics for teams to raise deviations, tech debt, or new discoveries for rapid guidance.
- **Change Control**: Lightweight RFC workflow for emerging knowledge; update ADRs and diagrams in near-real time.

## Quality & Governance Framework
- **Architectural Fitness Functions**: Automated checks (dependency rules, latency budgets, schema contracts) in CI.
- **Non-Functional Validation**: Performance modelling, load testing, chaos drills, and failover rehearsals pre-launch.
- **Security & Compliance**: Embed threat modelling, data classification reviews, and audit trail requirements.
- **Observability Readiness**: Define golden signals, tracing standards, logging schemas before feature rollout.

## Continuous Improvement & Knowledge Ops
- **Architecture Radar**: Quarterly review of technology landscape, retirements, and pilots.
- **Post-Incident Reviews**: Convert incident learnings into architecture improvements, update runbooks and guardrails.
- **Capability Scorecards**: Measure architecture health (coupling, reliability, change fail rate) and set improvement OKRs.
- **Knowledge Sharing**: Maintain architecture playbook, host brown-bags, capture learnings in wiki + service catalog.

## Collaboration Interfaces
- **With Product & CEO/CTO**: Align on strategic bets, cost envelopes, sequencing, and build/buy decisions.
- **With Security**: Run joint threat models, privacy reviews, and compliance sign-offs.
- **With SRE/DevOps**: Plan capacity, release strategies, infrastructure automation, and resilience practices.
- **With Data & ML**: Coordinate event schemas, analytics requirements, and data governance policies.
