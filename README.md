# Next.js Keycloak starter

## Why?

This is intended to be a starting point for integrating KeyCloak with Next.js by keeping KeyCloak as not only the identity provider but also the session manager.

There are many awesome solutions out there that incorporate Keycloak as an identity provider option but then handle the session management themselves instead of using the Keycloak-issued access and refresh tokens.

This works fine if Next.js is your backend or if Next.js takes the full role of a backend for frontend (BFF). But as soon as Next.js is not fully in charge of handling everything that's going on, you will end up needing to provide the backend with some sort of authentication token. This is where the Keycloak-issued tokens come in perfectly.
Solutions like NextAuth.js have a solution for this in their refresh token rotation guide, but considering NextAuth.js is not recommended for new projects anymore (due to being replaced with better-auth, for which I could not find something similar), this is no longer that viable of an option.

This project will also be fairly easy to adapt to other OAuth2-compatible solutions that support JWKs.

## Why is the refresh/access token stored in plain text?
To use the access token on the client, there is an HTTP endpoint for that. So the access token is inherently "leaked" to the user anyway. This is a deliberate design decision.

As for the refresh token, there is no point in securing it. If it were encrypted with, e.g. iron-session, a hijacker could still just use the iron-session cookie to get new access tokens.
It doesn't leak sensitive information in Keycloak, so encrypting it is unnecessary overhead for no gain.

## Does this support refresh token rotation ("Revoke refresh token")?

Unfortunately, no. On a client-side application, implementing refresh token rotation is trivial. The client holds the state and can implement locking mechanisms to avoid race conditions.

On a server-side application, this is not the case. The server has to handle multiple requests from the same user potentially at the same time on potentially different server instances.

I opted for no refresh token rotation; however, if I were to implement it, I would recommend having a global store like, e.g., Redis to hold a lock for refreshing (so only one request happens at once)
and store token exchange information. If a refresh token gets swapped, the previous one gets stored as a key and the new one as the value. Any subsequent refresh attempts would check
this store to see if the token has been swapped and use the new one if so. To avoid leaking user information, there should be a very short TTL on these keys, e.g., 1 minute.

The only other option would be to store a session ID and map it to the current refresh token on the server side from a database, but that would defeat the purpose of refresh token rotation in the first place.

## Getting Started

First, configure a new client in Keycloak. This project uses the standard authentication flow and does not require "client authentication."
To make sure the Next.js instance can check the audience, you need to add it to the claim:

Go to Client Scopes -> {client-id}-dedicated -> Add mapper -> By Configuration -> Audience -> Set "Included Client Audience" to contain the client ID. Add a name like "self-audience" and keep the defaults.

Set the following env variables:
```env
KEYCLOAK_URL=https://<keycloak-host>/realms/<realm>
KEYCLOAK_CLIENT_ID=<client-id>
KEYCLOAK_CLIENT_SECRET=<secret>
PUBLIC_URL=http://localhost:3000
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

