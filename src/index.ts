import type { Handle, RequestEvent } from "@sveltejs/kit"
import type { SessionLocals } from "@macfja/sveltekit-session"
import { js2xml, xml2js } from "xml-js"

type ServiceValidation = {
	serviceResponse: {
		authenticationFailure?: ServiceValidationFailure
		authenticationSuccess?: ServiceValidationSuccess
	}
}
type ServiceValidationFailure = {
	_attributes: {
		code: string
	}
	_text: string
}
type ServiceValidationSuccess = {
	user: {
		_text: string
	}
	attributes: Record<string, string>
}
export type TrailingSlashFunction = (
	route: Pick<RequestEvent, "route">["route"]
) => "never" | "always" | "ignore"
export type CasSession = {
	/** The username of the current authenticated user. */
	user: string
	/** Any additional data on the user return by the CAS server. */
	attributes: Record<string, unknown>
}

const getCasHelper = (
	root: string,
	version: 1 | 2 | 3,
	event: RequestEvent,
	trailing: TrailingSlashFunction
) => {
	return {
		getValidationUrl(ticket: string): string {
			let validationPath = ""
			switch (version) {
				case 1:
					validationPath = "validate"
					break
				case 2:
					validationPath = "serviceValidate"
					break
				case 3:
					validationPath = "p3/serviceValidate"
			}
			return `${root}/cas/${validationPath}?service=${encodeURI(
				this.sanitizedService()
			)}&ticket=${ticket}`
		},
		getLoginUrl(): string {
			return root + "/cas/login?service=" + encodeURI(this.sanitizedService())
		},
		sanitizedService(): string {
			const newUrl = new URL(event.url)
			if (newUrl.pathname.endsWith("/__data.json")) {
				newUrl.pathname = newUrl.pathname.substring(
					0,
					newUrl.pathname.length - "__data.json".length
				)
			}
			newUrl.searchParams.delete("ticket")
			newUrl.searchParams.delete("x-sveltekit-invalidated")
			const urlString = newUrl.toString()

			switch (trailing(event.route)) {
				case "ignore":
					return urlString
				case "never":
					return urlString.substring(0, urlString.length - (urlString.endsWith("/") ? 1 : 0))
				case "always":
					return urlString + (urlString.endsWith("/") ? "" : "/")
			}
		}
	}
}
function getTicket(event: RequestEvent): string | undefined {
	if (!event.url.searchParams.has("ticket")) return undefined
	const ticket = event.url.searchParams.get("ticket") as string
	return ticket.startsWith("ST-") ? ticket : undefined
}
function redirect(url: string): Response {
	return new Response(null, {
		status: 302,
		headers: {
			location: url
		}
	})
}

/**
 * SvelteKit server Hook Handler.
 * @example
 * ```typescript
 * // src/hooks.server.ts
 * import { sessionHook } from "@macfja/sveltekit-session";
 * import { casHandler } from "@macfja/sveltekit-cas"
 * import type { Handle } from "@sveltejs/kit"
 * import { sequence } from "@sveltejs/kit/hooks"
 *
 * export const handle: Handle = sequence(sessionHook(), casHandler(
 * 	 'http://0.0.0.0:8080',
 * 	 2,
 * 	 (event) => event.url.pathname.startsWith('/sverdle'),
 * 	 () => false,
 * 	 (route) => route.id === '/blog/[slug]' ? 'never' : 'ignore'
 * ))
 * ```
 * @param casRoot
 * 		The Root url of the CAS server
 * @param casVersion
 * 		The version of the CAS server
 * @param authRequired
 * 		Define if a request (first parameter) should be behind the CAS (return true if the request need to be authenticated).
 * 		By default, all request need authentication.
 * @param rejectAccess
 * 		Define if for a request (first parameter) the authentication of a user (second parameter) is allowed (return true if the user is not allowed).
 * 		By default, there are no restriction on the authenticated user.
 * @param trailingSlash
 * 		Define if the trailing slash of a route should be added/removed or left untouched
 * 		By default, the trailing slash is left untouched
 * @return {Handle}
 */
export function casHandler(
	casRoot: string,
	casVersion: 1 | 2 | 3,
	authRequired: (event: RequestEvent) => boolean = () => true,
	rejectAccess: (event: RequestEvent, authenticationInformation: CasSession) => boolean = () =>
		false,
	trailingSlash: TrailingSlashFunction = () => "ignore"
): Handle {
	return function (input: Parameters<Handle>[0]): ReturnType<Handle> {
		if (!authRequired(input.event)) {
			return input.resolve(input.event)
		}

		if ((input.event.locals as SessionLocals).session.cas) {
			if (
				rejectAccess(input.event, (input.event.locals as SessionLocals).session.cas as CasSession)
			) {
				return new Response(null, {
					status: 403
				})
			}
			return input.resolve(input.event)
		}

		switch (casVersion) {
			case 1:
				return cas1Hook(casRoot, input.event, trailingSlash)
			case 2:
				return cas23Hook(casRoot, 2, input.event, trailingSlash)
			case 3:
			default:
				return cas23Hook(casRoot, 3, input.event, trailingSlash)
		}
	}
}

async function cas1Hook(
	casRoot: string,
	event: RequestEvent,
	trailing: TrailingSlashFunction
): Promise<Response> {
	const casHelper = getCasHelper(casRoot, 1, event, trailing)
	let ticket: undefined | string
	if ((ticket = getTicket(event)) !== undefined) {
		const validation: Array<string> = await event
			.fetch(casHelper.getValidationUrl(ticket))
			.then((response) => response.text())
			.then((response) => response.split("\n"))

		if (validation.length === 2) {
			if (validation[0] === "no") {
				return new Response("Authentication failure", { status: 403 })
			}
		}
		if (validation.length === 3) {
			if (validation[0] === "yes") {
				;(event.locals as SessionLocals).session.cas = {
					user: validation[1],
					attributes: {}
				}
				return redirect(casHelper.sanitizedService())
			}
		}
		return new Response("Unknown CAS validation response", { status: 500 })
	}

	return redirect(casHelper.getLoginUrl())
}
async function cas23Hook(
	casRoot: string,
	version: 2 | 3,
	event: RequestEvent,
	trailing: TrailingSlashFunction
): Promise<Response> {
	const casHelper = getCasHelper(casRoot, version, event, trailing)
	let ticket: undefined | string
	// Forcefully remove namespace in XML node element
	const namespaceRemover = (name: string) => (/:/.test(name) ? name.split(":")[1] : name)
	if ((ticket = getTicket(event)) !== undefined) {
		const validation: ServiceValidation = await event
			.fetch(casHelper.getValidationUrl(ticket))
			.then((response) => response.text())
			.then(
				(response) =>
					xml2js(response, { compact: true, elementNameFn: namespaceRemover }) as ServiceValidation
			)
			.catch((reason) => {
				console.error(
					"An error occur while validating the CAS ticket: " + reason,
					casHelper.getValidationUrl(ticket as string)
				)
				return {} as ServiceValidation
			})

		if (!Object.keys(validation).includes("serviceResponse")) {
			console.error(
				"Unknown CAS validation response",
				casHelper.getValidationUrl(ticket),
				js2xml(validation)
			)
			return new Response("Unknown CAS validation response", { status: 500 })
		}
		if (Object.keys(validation.serviceResponse).includes("authenticationFailure")) {
			return new Response(
				`Authentication failure: ${
					(validation.serviceResponse.authenticationFailure as ServiceValidationFailure)._text
				}`,
				{ status: 403 }
			)
		}
		if (Object.keys(validation.serviceResponse).includes("authenticationSuccess")) {
			;(event.locals as SessionLocals).session.cas = {
				user: (validation.serviceResponse.authenticationSuccess as ServiceValidationSuccess).user
					._text,
				attributes: (validation.serviceResponse.authenticationSuccess as ServiceValidationSuccess)
					.attributes
			}
			return redirect(casHelper.sanitizedService())
		}
		return new Response("Unknown CAS validation response", { status: 500 })
	}

	return redirect(casHelper.getLoginUrl())
}

/**
 * Get the username of the authenticated user
 * @param event The current RequestEvent
 * @return `undefined` if there are not connected user
 */
export function getUsername(event: RequestEvent): string | undefined {
	return ((event.locals as SessionLocals).session?.cas as CasSession)?.user
}
