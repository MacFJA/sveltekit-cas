# SvelteKit CAS authentication

A set of functions to ease usage of a CAS/SSO in SvelteKit

![Github CI](https://github.com/macfja/sveltekit-cas/workflows/Quality%20checks/badge.svg)
![GitHub Repo stars](https://img.shields.io/github/stars/macfja/sveltekit-cas?style=social)
![NPM bundle size](https://img.shields.io/bundlephobia/minzip/@macfja/sveltekit-cas)
![Download per week](https://img.shields.io/npm/dw/@macfja/sveltekit-cas)
![License](https://img.shields.io/npm/l/@macfja/sveltekit-cas)
![NPM version](https://img.shields.io/npm/v/@macfja/sveltekit-cas)
![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/@macfja/sveltekit-cas)

## Installation

```shell
npm install --save @macfja/sveltekit-cas
```

## Usage

Protect all pages that start with `/profile/` and only allow user to go on his own page (`/profile/my-cool-username`)

```typescript
// src/hooks.server.ts
import { sessionHook } from "@macfja/sveltekit-session"
import { casHandler } from "@macfja/sveltekit-cas"
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

export const handle: Handle = sequence(
	sessionHook(),
	casHandler(
		"http://0.0.0.0:8080",
		2,
		(event) => event.url.pathname.startsWith("/profile/"),
		(event, user) => {
			const regexp = event.url.pathname.match(/\/profile\/(\w+)/)
			return user !== regexp[1]
		}
	)
)
```

Protect endpoint, so only connected user can access it

```typescript
// src/routes/api/user/server.ts
import { error } from "@sveltejs/kit"
import { getUsername } from "@macfja/sveltekit-cas"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async (event) => {
	if (getUsername(event) !== "admin") {
		throw error(403)
	}

	// ... Do operation that only the user `admin` can do
}

export const GET: RequestHandler = async (event) => {
	if (getUsername(event) === undefined) {
		throw error(401)
	}

	// ... Do operation that only connected user can do
}
```

## Configuration

The `casHandler` function take 4 parameters to change its behavior:

- `casRoot`: The root URL to the CAS server
- `casVersion`: The version of the CAS server (supported version: `1`, `2`, `3`)
- `authRequired` _(optional)_: A function to indicate if a request should have an authenticated user
- `rejectAccess` _(optional)_: A function to indicate if a particular authenticated user if allowed to do a request

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.

Read more in the [Contributing file](CONTRIBUTING.md)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
