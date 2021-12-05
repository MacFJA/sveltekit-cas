import type { ServerRequest, ServerResponse } from "@sveltejs/kit/types/hooks"
import env from "env-var"
import Cookie from "universal-cookie"
import { getCasUser, getJwtUser } from "./cas"

const cookieName = env.get("CAS_SESSION_COOKIE").default("session").asString()

/**
 * Hooks handler for CAS.
 *
 * This function is intended to by use in the `handle` function of your `src/hooks.js`.
 *
 * Like for example:
 * ```javascript
 * // src/hooks.js
 * import { casHandler } from "@macfja/sveltekit-cas"
 *
 * export async function handle({ request, resolve }) {
 * 	return (
 * 		(await casHandler(
 * 			// All URL prefixed by `/profile/` will be behind the CAS
 * 			(request) => request.path.startsWith("/profile/"),
 * 			// Deny access if the username from the CAS is not the same as the one in the URL
 * 			(request, user) => {
 * 				const regexp = request.path.match(/\/profile\/(\w+)/)
 * 				return user !== regexp[1]
 * 			},
 * 			request
 * 		)) || resolve(request)
 * 	)
 * }
 * ```
 *
 * @param {(request: ServerRequest) => boolean} filterOn
 *    Function to determine if a request should be authenticated.
 *    If you want all requests to be authenticated, then always return true: `() => true`
 * @param {(request: ServerRequest, user: string) => boolean} rejectOn
 *    Function to reject an authenticated user from a page or not.
 *    If you only want a user to be connected, then always return false: `() => false`
 * @param {ServerRequest<Record<string, any>, Body>} request
 *    The server request
 *
 * @return {Promise<ServerResponse | null>}
 *    Return a promise that resolve to:
 *
 *    - `null` if the access is **GRANTED**
 *    - a _redirection_ (`ServerResponse`) if the user need to go to the CAS login page
 *    - a _403_ (`ServerResponse`) if the access is **DENIED**
 */
export async function casHandler(
	filterOn: (request: ServerRequest) => boolean,
	rejectOn: (request: ServerRequest, user: string) => boolean,
	request: ServerRequest<Record<string, any>, Body>
): Promise<ServerResponse | null> {
	const cookies = new Cookie(request.headers.cookie)

	if (!filterOn(request)) {
		return null
	}

	const data = await getCasUser(cookies.get(cookieName), request.path, request.query.get("ticket"))
	if (data.redirect) {
		return {
			status: 302,
			headers: {
				location: data.redirect,
				"set-cookie": cookieName + "=" + (data.session ?? "") + ";Secure;HttpOnly"
			}
		}
	}
	if (rejectOn(request, data.user)) {
		return {
			status: 403,
			headers: {}
		}
	}
	return null
}

/**
 * Get token used to know if the user is connected.
 * This the value that you will need to communicate to your endpoint to validate that the request is made by an authenticated user.
 *
 * ```javascript
 * // src/hooks.js
 * import { getSessionToken } from "@macfja/sveltekit-cas"
 * export function getSession(request) {
 * 	return {
 * 		...getSessionToken(request)
 * 	}
 * }
 * ```
 *
 * @param {ServerRequest} request The request of the current HTTP call
 * @return {{ token: string | null }} Return an object that contain one key named `token`, with the value to the token string or `null` (if the user is not authenticated)
 */
export function getSessionToken(request: ServerRequest): { token: string | null } {
	const cookies = new Cookie(request.headers.cookie)
	return {
		token: cookies.get(cookieName) ?? null
	}
}
/**
 * Get the user name of the connected user.
 *
 * ```javascript
 * // src/hooks.js
 * import { getSessionUser } from "@macfja/sveltekit-cas"
 * export function getSession(request) {
 * 	return {
 * 		...getSessionUser(request)
 * 	}
 * }
 * ```
 *
 * @param {ServerRequest} request The request of the current HTTP call
 * @return {{ user: string | null }} Return an object that contain one key named `user`, with the value to the username or `null` (if the user is not authenticated)
 */
export function getSessionUser(request: ServerRequest): { user: string | null } {
	const cookies = new Cookie(request.headers.cookie)
	return {
		user: getJwtUser(cookies.get(cookieName))
	}
}
