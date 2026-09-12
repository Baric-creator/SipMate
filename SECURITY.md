# SipMate Security Policy

SipMate takes security and user privacy seriously.

## Reporting a vulnerability

If you discover a security issue, please do **not** open a public GitHub issue containing exploit details, credentials, personal data, or reproduction steps that could put users at risk.

Report security concerns privately to:

**sipmate.app@gmail.com**

Please include, where possible:
- a short description of the issue
- the affected page, endpoint, or app flow
- steps to reproduce
- the potential impact
- screenshots or logs with secrets and personal data removed

## Sensitive information

Never commit or publish service-role keys, Stripe secret keys, webhook secrets, private signing keys, service-account credentials, passwords, or access tokens.

Client-side publishable/anonymous keys may appear in frontend code when intended by the underlying platform, but privileged secrets must remain server-side.

## Supported project

Security reports should relate to the current SipMate website, mobile application, backend, or official integrations.
