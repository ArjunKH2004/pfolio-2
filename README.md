# pfolio-2

A revised product design portfolio by K H Arjun.

This repository began as a complete copy of `ArjunKH2004/arjun-anti-portfolio`. The revision keeps its restrained terminal and editorial identity while improving recruiter orientation, project navigation, accessibility, progressive enhancement, route resilience, search metadata and asset delivery.

## Local development

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The project uses React, TypeScript, Vite, Hono and Cloudflare Workers.

## Routes

- `/`
- `/projects`
- `/projects/ksrtc-workflow`
- `/projects/tejasvi-26`
- `/projects/growit`
- `/archive`
- `/about`
- `/contact`

Unknown routes render an accessible 404 view. Core contact and resume information remains available when JavaScript is disabled.
