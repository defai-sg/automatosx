# Quality Engineering Tool Stack

## Strategy & Governance Layer
- **Workboard / Perdoo**: Quality OKRs, initiative tracking, alignment with product and platform roadmaps.
- **ServiceNow GRC / ZenGRC / OneTrust**: Control libraries, audit evidence, risk registers, compliance management.
- **Smartsheet / Notion / Confluence**: Quality playbooks, CAPA logs, policy repositories, stakeholder updates.
- **Tableau / Looker / Power BI**: Quality KPI dashboards (defect density, escape rate, MTTR, test coverage, NPS).

## Test Design & Management
- **TestRail / Xray / qTest**: Test case lifecycle, traceability, analytics, automation integration.
- **PractiTest / Zephyr**: End-to-end test management, agile planning, release dashboards, Jira integration.
- **Model-Based Testing (GraphWalker, MBT Studio)**: Coverage visualisation, path generation, risk-based prioritisation.
- **MindMup / Miro**: Exploratory charters, test design workshops, scenario mapping.

## Automation & Execution Platforms
- **Web & UI**: Playwright, Cypress, Selenium/Grid, TestCafe for cross-browser and responsive coverage.
- **API & Service**: Postman/Newman, REST Assured, Pact (consumer-driven contracts), WireMock (service simulation).
- **Mobile**: Appium, Detox, Firebase Test Lab, BrowserStack App Live for device coverage.
- **Desktop & Native**: WinAppDriver, Winium, Electron Spectron, Business Process Testing suites.
- **CI/CD Integration**: GitHub Actions, Jenkins, CircleCI, Buildkite pipelines with parallel execution and quality gates.

## Performance, Resilience & Scalability
- **Load & Stress**: k6, Gatling, JMeter, Locust for HTTP/WebSocket performance.
- **Enterprise**: NeoLoad, LoadRunner, BlazeMeter for protocol breadth and enterprise reporting.
- **Resilience & Chaos**: Gremlin, Chaos Mesh, Litmus for failure injection and SLO validation.
- **Profiling & APM**: Datadog APM, New Relic, Dynatrace to pinpoint bottlenecks and resource leaks.

## Security, Accessibility & Compliance
- **Application Security**: OWASP ZAP, Burp Suite, Nessus, Checkmarx, Veracode, Snyk for static/dynamic scanning.
- **Compliance Tooling**: Axe, AXE Linter, Pa11y, WAVE, Lighthouse for accessibility; Privacy frameworks (TrustArc).
- **Secrets & Config**: HashiCorp Vault, Doppler, 1Password for secure test credentials and data masking.

## Observability & Analytics
- **Monitoring**: Datadog, Grafana/Prometheus, Honeycomb for golden signal dashboards and root-cause correlation.
- **Log Analysis**: ELK/Opensearch, Splunk for anomaly detection, RCA evidence collection.
- **Feature Flags & Experimentation**: LaunchDarkly, Split, Optimizely to coordinate progressive delivery with quality gates.
- **Incident Management**: PagerDuty, Incident.io, Opsgenie for alerting, response workflows, and retrospectives.

## Test Data & Environment Management
- **Data Fabric**: Delphix, Tonic, Redgate SQL Clone for masked, versioned datasets.
- **Service Virtualisation**: WireMock, Hoverfly, Mountebank for dependency simulation and isolation.
- **Environment Orchestration**: Terraform, Pulumi, Helm, Docker Compose for reproducible test environments.
- **Scheduling & Booking**: OpenTofu/Spinnaker + internal portals to manage environment contention.

## Documentation & Knowledge Sharing
- **Notion / Confluence / Slab**: Quality runbooks, checklists, RCA templates, onboarding guides.
- **GitBook / MkDocs**: External-facing quality assurances, customer trust portals, API quality docs.
- **Loom / Scribe / Tango**: Visual walkthroughs, workflow captures, self-serve training materials.

## Communication & Collaboration
- **Slack / Teams**: Quality war rooms, incident bridges, quality bot reminders.
- **Jira / Shortcut**: Defect lifecycle, automation backlog, RCA actions, release votes.
- **Miro / FigJam**: Value stream mapping, process redesign, failure mode effect analysis (FMEA).

## Tooling Principles
- Instrument pipelines: enforce quality gates, flaky test quarantines, and automated triage.
- Integrate telemetry: pipe automation results, incident signals, and customer feedback into shared dashboards.
- Prioritise maintainability: refactor frameworks, modularise utilities, and document usage patterns.
- Democratise access: provide self-serve portals, golden paths, and office hours for teams adopting quality tooling.
