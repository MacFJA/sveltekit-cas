import env from "env-var"
import { CASClientV2 } from "logical-cas-client"
import njwt from "njwt"
const create = njwt.create,
	verify = njwt.verify

/**
 * @internal
 * @param {string} username
 */
const createJwt = (username: string) =>
	create(
		{
			iss: env.get("JWT_ISS").default("sveltekit-cas").asString(),
			sub: "cas/" + username,
			scope: "user"
		},
		env.get("JWT_SECRET").default("changeme").asString()
	)

/**
 * @internal
 * @param {string} jwtString
 */
const readJwt = (jwtString: string) => {
	return verify(jwtString, env.get("JWT_SECRET").default("changeme").asString())
}
/**
 * @internal
 * @param jwtString
 */
export const getJwtUser = (jwtString: string): string | null => {
	try {
		const jwt = readJwt(jwtString)
		return jwt.body.toJSON()?.sub?.toString().substring(4)
	} catch (e) {
		return null
	}
}

/**
 * @internal
 * @param {string} path
 * @param {(user: string) => void} onSuccess
 * @param {(error, req) => void} onFailure
 */
const createCas = (path: string, onSuccess, onFailure): CASClientV2 => {
	return new CASClientV2(
		{
			host: env.get("PUBLIC_HOST").required().asString(),
			secure: true,
			port: env.get("PUBLIC_PORT").default(443).asPortNumber(),
			server: {
				host: env.get("CAS_HOST").required().asString(),
				port: env.get("CAS_PORT").default(443).asPortNumber(),
				version: env.get("CAS_VERSION").default("3.0").asString(),
				secure: true
			},
			endpoints: {
				ticketVerificationPath: path
			}
		},
		(req, res, user) => onSuccess(user),
		(req, res, error) => onFailure(error, req)
	)
}

/**
 * @internal
 * @param session
 * @param path
 * @param ssoTicket
 */
export const getCasUser = async (
	session: string | null,
	path: string,
	ssoTicket?: string
): Promise<{ session: string; user?: string; redirect?: string }> => {
	if (session) {
		const jwtUser = getJwtUser(session)
		if (jwtUser) {
			return {
				session,
				user: getJwtUser(session)
			}
		}
	}

	let ssoUser
	let redirect
	const cas = createCas(
		path,
		(user) => (ssoUser = user),
		() => (redirect = "/")
	)

	if (ssoTicket) {
		await cas.verifyTicket(
			{
				path: path,
				query: { ticket: ssoTicket }
			},
			{}
		)
		const jwt = createJwt(ssoUser)
		return {
			redirect: path,
			user: ssoUser,
			session: jwt.compact()
		}
	}

	await cas.redirectToCASLogin(
		{},
		{
			redirect: (url) => {
				redirect = url
			}
		}
	)
	return {
		redirect,
		session
	}
}
