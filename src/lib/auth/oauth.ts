import * as arctic from "arctic";
import {COOKIE_PREFIX} from "@/lib/auth/constants";
import jwksClient from "jwks-rsa";
import * as jwt from "jsonwebtoken";
import {Jwt, JwtHeader, JwtPayload, SigningKeyCallback, VerifyOptions} from "jsonwebtoken";

export const keycloakJWKClient = jwksClient({
    jwksUri: `${process.env.KEYCLOAK_URL as string}/protocol/openid-connect/certs`,
    requestHeaders: {}, // Optional
    timeout: 30000, // Defaults to 30s,
    cache: true,
    cacheMaxEntries: 10,
    cacheMaxAge: 3600000, // Do 1h. JWKs typically don't change, so no need to refresh that often
});

export const keycloakClient = new arctic.KeyCloak(
    process.env.KEYCLOAK_URL as string,
    process.env.KEYCLOAK_CLIENT_ID as string,
    process.env.KEYCLOAK_CLIENT_SECRET as string,
    process.env.PUBLIC_URL as string + "/api/auth/callback"
);

export const LOGIN_STATE_COOKIE_NAME = COOKIE_PREFIX + "oauth-code-verifier"
export const CODE_VERIFIER_COOKIE_NAME = COOKIE_PREFIX + "oauth-login-state"


export function generateLoginURL() {
    const state = arctic.generateState();
    const codeVerifier = arctic.generateCodeVerifier();

    const scopes = ["openid"];
    const authorizationURL = keycloakClient.createAuthorizationURL(state, codeVerifier, scopes);

    return { url: authorizationURL, state, codeVerifier };
}

function getKey(header: JwtHeader, callback: SigningKeyCallback){
    keycloakJWKClient.getSigningKey(header.kid, function(err, key) {
        if(key == undefined) return callback(err);

        return callback(null, key.getPublicKey());
    });
}

export function verifyToken(token: string, options?: VerifyOptions): Promise<string | Jwt | JwtPayload | undefined> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
            ...options,
            //TODO: Verify audience?
        }, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            return resolve(decoded);
        })
    })
}