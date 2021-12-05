# SvelteKit CAS authentication

A set of functions to ease usage of a CAS/SSO in SvelteKit

## Installation

```shell
npm install --save @macfja/sveltekit-cas
```

## Usage

Protect all pages that start with `/profile/` and only allow user to go on his own page (`/profile/my-cool-username`) and fill the session with the token (or `null`) to provide to endpoints and the username of the connected user (or `null`)

```javascript
// src/hooks.js
import { casHandler, getSessionToken, getSessionUser } from "@macfja/sveltekit-cas"

export async function handle({ request, resolve }) {
	return (
		(await casHandler(
			(request) => request.path.startsWith("/profile/"),
			(request, user) => {
				const regexp = request.path.match(/\/profile\/(\w+)/)
				return user !== regexp[1]
			},
			request
		)) || resolve(request)
	)
}

export function getSession(request) {
	return {
		...getSessionToken(request),
		...getSessionUser(request)
	}
}
```

Protect endpoint, so only connected user can access it

```javascript
// src/routes/api/user.js
import { validate, validateUser } from "@macfja/sveltekit-cas"

export async function post({ headers }: ServerRequest): Promise<EndpointOutput> {
	const token = headers.token ?? null
	const access = validateUser(token, "admin")

	if (access !== null) {
		return access
	}

	// ... Do operation that only the user `admin` can do
}

export async function get({ headers }: ServerRequest): Promise<EndpointOutput> {
	const token = headers.token ?? null
	const access = validate(token)

	if (access !== null) {
		return access
	}

	// ... Do operation that only connected user can do
}
```

## Configuration

The package have several configuration.  
They are all have to be set as environment variables

| Name                 | Default                         | Comment                                                  |
| -------------------- | ------------------------------- | -------------------------------------------------------- |
| `PUBLIC_HOST`        | _no default, value is required_ | Public server domain name                                |
| `PUBLIC_PORT`        | `443`                           | Public server port                                       |
| `CAS_HOST`           | _no default, value is required_ | Host of the SSO server                                   |
| `CAS_PORT`           | `443`                           | Port of the SSO server                                   |
| `CAS_SESSION_COOKIE` | `session`                       | The name of the cookie that will contain the JWT session |
| `JWT_ISS`            | `sveltekit-cas`                 | The issuer of the JWT token                              |
| `JWT_SECRET`         | `changeme`                      | The key used to generate the token signature             |

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.

Read more in the [Contributing file](CONTRIBUTING.md)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
