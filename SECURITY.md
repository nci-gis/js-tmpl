# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version      | Supported          |
| ------------ | ------------------ |
| 0.0.x (beta) | :white_check_mark: |

## Security Considerations

### Template Security

js-tmpl renders Handlebars templates with user-provided data. Be aware of:

1. **Template Injection**: Only use templates from trusted sources
2. **Path Traversal**: Validate template paths to prevent directory traversal
3. **Environment Variables**: The `env` object in templates exposes `process.env` - be cautious with sensitive values

### Best Practices

- **Don't commit secrets** to values files
- **Use environment variables** for sensitive configuration
- **Validate template sources** before rendering
- **Review generated output** before deploying to production

### File System Access

js-tmpl writes files to the filesystem. Ensure:

- Output directory (`outDir`) is properly constrained
- Template directory (`templateDir`) is from a trusted source
- File permissions are set appropriately

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow responsible disclosure:

### How to Report

**DO NOT open a public issue for security vulnerabilities.**

Instead, please report security issues through GitHub's Security Advisory feature:

1. Go to https://github.com/nci-gis/js-tmpl/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with details

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Triage**: Within 7 days
- **Fix & Release**: Depends on severity (critical: ASAP, high: 14 days, medium: 30 days)

### Disclosure Policy

- We will confirm receipt of your report
- We will investigate and validate the vulnerability
- We will develop and test a fix
- We will release a security update
- We will credit you in the security advisory (unless you prefer anonymity)

## Security Updates

Security updates are released as:

- Patch versions (0.0.x) for beta releases
- Published to npm with release notes
- Announced in CHANGELOG.md

## Contact

For non-security issues, please use [GitHub Issues](https://github.com/nci-gis/js-tmpl/issues).

For security concerns, use the GitHub Security Advisory feature linked above.
