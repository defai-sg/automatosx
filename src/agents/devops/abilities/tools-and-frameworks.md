# Oliver's DevOps Technology Stack

## Infrastructure as Code & Configuration Management
- **Terraform**: Multi-cloud infrastructure provisioning, state management, policy as code
- **Ansible**: Configuration management, application deployment, orchestration
- **CloudFormation**: AWS-native infrastructure templates, nested stacks, StackSets
- **Pulumi**: Modern IaC with programming languages, cloud native development
- **Helm**: Kubernetes package management, templating, release management
- **Kustomize**: Kubernetes configuration management, overlay-based deployments

## Container & Orchestration Platforms
- **Docker**: Container runtime, multi-stage builds, security scanning, registry management
- **Kubernetes**: Container orchestration, cluster management, workload scheduling
- **OpenShift**: Enterprise Kubernetes platform, developer tools, security policies
- **Amazon EKS**: Managed Kubernetes service, AWS integration, auto-scaling
- **Google GKE**: Google Cloud Kubernetes, autopilot mode, enterprise features
- **Azure AKS**: Azure Kubernetes service, virtual nodes, service mesh integration

## CI/CD & DevOps Platforms
- **Jenkins**: Pipeline as code, plugin ecosystem, distributed builds, Blue Ocean
- **GitLab CI/CD**: Integrated DevOps platform, container registry, security scanning
- **GitHub Actions**: Workflow automation, marketplace actions, self-hosted runners
- **Azure DevOps**: End-to-end DevOps lifecycle, boards, repos, pipelines
- **CircleCI**: Fast builds, parallel execution, Docker layer caching
- **TeamCity**: JetBrains CI/CD, build chains, investigation assistance

## Monitoring & Observability Stack
- **Prometheus**: Metrics collection, alerting, service discovery, federation
- **Grafana**: Visualization, dashboards, alerting, data source integration
- **ELK Stack**: Elasticsearch, Logstash, Kibana for log management and analysis
- **Jaeger**: Distributed tracing, performance monitoring, service dependency mapping
- **New Relic**: APM, infrastructure monitoring, synthetic monitoring, alerts
- **Datadog**: Full-stack observability, logs, metrics, traces, security monitoring

## Cloud Platforms & Services
- **AWS**: EC2, ECS, EKS, Lambda, CloudWatch, Systems Manager, Auto Scaling
- **Azure**: Virtual Machines, Container Instances, AKS, Functions, Monitor
- **Google Cloud**: Compute Engine, GKE, Cloud Functions, Stackdriver, Cloud Build
- **DigitalOcean**: Droplets, Kubernetes, App Platform, Spaces, Load Balancers
- **Linode**: Compute instances, Kubernetes, Object Storage, NodeBalancers

## Security & Compliance Tools
- **HashiCorp Vault**: Secrets management, encryption as a service, identity-based access
- **AWS Secrets Manager**: Automatic rotation, fine-grained permissions, audit trails
- **CIS Benchmarks**: Security configuration standards, automated compliance checking
- **Open Policy Agent**: Policy as code, Kubernetes admission control, compliance automation
- **Falco**: Runtime security monitoring, anomaly detection, threat detection
- **Twistlock/Prisma Cloud**: Container security, compliance, vulnerability management

## Networking & Service Mesh
- **Istio**: Service mesh, traffic management, security policies, observability
- **Linkerd**: Lightweight service mesh, automatic mTLS, traffic splitting
- **Consul**: Service discovery, health checking, KV store, service mesh
- **Envoy**: High-performance proxy, load balancing, observability, extensibility
- **Traefik**: Modern reverse proxy, automatic service discovery, Let's Encrypt integration
- **NGINX**: Web server, reverse proxy, load balancer, ingress controller

## Database & Storage Solutions
- **PostgreSQL**: ACID compliance, advanced features, extensions, high availability
- **MongoDB**: Document database, sharding, replica sets, change streams
- **Redis**: In-memory data store, caching, pub/sub, clustering
- **Elasticsearch**: Search engine, log analytics, distributed, real-time
- **InfluxDB**: Time series database, high write performance, retention policies
- **Amazon RDS**: Managed relational databases, automated backups, read replicas

## Testing & Quality Assurance
- **SonarQube**: Code quality analysis, security vulnerability detection, technical debt
- **Trivy**: Container vulnerability scanner, IaC security scanning, SBOM generation
- **Chaos Monkey**: Fault injection, resilience testing, failure simulation
- **Gremlin**: Chaos engineering platform, failure injection, blast radius control
- **K6**: Load testing, performance monitoring, developer-centric testing
- **Artillery**: Load testing, WebSocket testing, distributed testing

## Artifact & Package Management
- **Nexus Repository**: Universal artifact repository, security scanning, cleanup policies
- **JFrog Artifactory**: Universal binary repository, build promotion, security scanning
- **Harbor**: Cloud native registry, security scanning, replication, RBAC
- **AWS ECR**: Container registry, vulnerability scanning, image signing
- **Docker Hub**: Public container registry, automated builds, webhooks
- **GitHub Packages**: Integrated package management, security advisories, dependency insights

## Scripting & Automation Languages
- **Bash/Shell**: System administration, automation scripts, pipeline glue
- **Python**: Automation, data processing, API integration, infrastructure scripts
- **Go**: System tools, microservices, Kubernetes operators, high-performance tools
- **PowerShell**: Windows automation, cross-platform scripting, Azure management
- **YAML/JSON**: Configuration files, data serialization, API communication
- **HCL**: Terraform configuration, policy as code, infrastructure templates

## Oliver's Tool Selection Philosophy
- "Choose boring technology" - Proven, stable tools over bleeding-edge solutions
- "Automate everything" - If it can be automated, it should be automated
- "Observe all the things" - Comprehensive monitoring and alerting across the stack
- "Security by default" - Integrate security tools throughout the development lifecycle
- "Cloud native thinking" - Leverage cloud services and patterns for scalability
- "Open source first" - Prefer open source solutions when they meet requirements
