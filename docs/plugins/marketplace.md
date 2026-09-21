# Yash.AI Plugin Marketplace Governance

This document describes the policies, security vetting standards, and publishing lifecycle for the Yash.AI Plugin Marketplace.

---

## 1. Marketplace Objectives

The Yash.AI Plugin Marketplace connects users with verified, secure integrations that expand the capabilities of Yash.AI while upholding strict security, user privacy, and data isolation guarantees.

---

## 2. Category Taxonomy

Every plugin is classified into one of the following primary categories:

1. **Productivity**: Personal organization, task management, calendar sync.
2. **Developer Tools**: Code repositories, issue trackers, CI/CD runners, cloud monitoring.
3. **Communication**: Chat apps, email integration, community messaging.
4. **Storage**: Cloud object storage, file drives, document archives.
5. **Research**: Knowledge graphs, scientific databases, academic papers.
6. **Finance**: Market data, portfolio trackers, invoicing services.
7. **Education**: Learning management, language tutors, quizzes.
8. **Automation**: Webhooks, multi-step workflow triggers.
9. **Data**: Analytics platforms, databases, spreadsheet connectors.
10. **AI**: Specialized model providers, audio/vision processors.

---

## 3. Review & Security Guidelines

Before a plugin is published or verified in the Yash.AI Marketplace, it must pass automated and manual security reviews:

1. **No Hardcoded Secrets**: Plugins must never include pre-configured API keys or credentials.
2. **Explicit Permission Declarations**: All tools must declare their exact permission tier (`read`, `write`, `admin`).
3. **Mandatory Confirmation for Write Operations**: Any tool modifying state or sending external communications must set `requires_confirmation: true`.
4. **SSRF Defense Compliance**: All network calls must accept validation from the `SSRFDefender`.
5. **Privacy & Data Handling**: Plugins must provide a valid `privacy_policy_url` and `documentation_url`.

---

## 4. Semantic Versioning & Upgrades

Plugins adhere strictly to Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **PATCH**: Bug fixes or performance improvements with no schema changes. Automatically updated.
- **MINOR**: New tools or non-breaking parameter additions. Users are notified.
- **MAJOR**: Breaking schema changes or new required permissions. Requires explicit re-installation and permission consent from the user.
