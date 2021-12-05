import type { EndpointOutput } from "@sveltejs/kit"
import { getJwtUser } from "./cas"

/**
 * Get the username from the token.
 * @internal
 *
 * @param {string | null} token
 * @return {string | null} The username or `null`
 */
function getUsername(token: string | null): string | null {
	if (token === null) {
		return null
	}

	return getJwtUser(token)
}

/**
 * Validate is the token is valid:
 *  - Check if the token is not expired
 *  - Check if the token have been created by the application
 *  - Check if the token contain an username
 *
 * ```javascript
 * // src/routes/api/user.js
 * import { validate } from "@macfja/sveltekit-cas"
 *
 * export async function get({ headers }: ServerRequest): Promise<EndpointOutput> {
 * 	const token = headers.token ?? null
 * 	const access = validate(token)
 *
 * 	if (access !== null) {
 * 		return access
 * 	}
 *
 * 	// ... Do operation that only authenticated user can do
 * }
 * ```
 * @param {string | null} token
 *    The token to validate
 *
 * @return {EndpointOutput | null}
 *    Return
 *
 *    - `null` if the token is valid
 *    - _401_ (`EndpointOutput`) if the token is **INVALID**
 */
export function validate(token: string | null): EndpointOutput | null {
	const userName = getUsername(token)

	if (userName === null) {
		return {
			status: 401
		}
	}

	return null
}

/**
 * Validate is the token is valid and match the requested user:
 *  - Check if the token is not expired
 *  - Check if the token have been created by the application
 *  - Check if the token contain an username
 *  - Check if the username in the token is the same as the requested username
 *
 * ```javascript
 * // src/routes/api/user.js
 * import { validateUser } from "@macfja/sveltekit-cas"
 *
 * export async function post({ headers, body }: ServerRequest): Promise<EndpointOutput> {
 * 	const token = headers.token ?? null
 * 	const username = body.get('username')
 * 	const access = validateUser(token, username ?? '')
 *
 * 	if (access !== null) {
 * 		return access
 * 	}
 *
 * 	// ... Do operation that only the user withe username `username` can do
 * }
 * ```
 * @param {string | null} token
 *    The token to validate
 * @param {string} user
 *    The username to validate against
 *
 * @return {EndpointOutput | null}
 *    Return
 *
 *    - `null` if the token is valid and teh username are the same
 *    - _401_ (`EndpointOutput`) if the token is **INVALID**
 *    - _403_ (`EndpointOutput`) if the username are **DIFFERENT**
 */
export function validateUser(token: string | null, user: string): EndpointOutput | null {
	const userName = getUsername(token)

	if (userName === null) {
		return {
			status: 401
		}
	}

	if (userName !== user) {
		return {
			status: 403
		}
	}

	return null
}
