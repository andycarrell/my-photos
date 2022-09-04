import invariant from "tiny-invariant";

import { redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  const appClientId = process.env.APP_CLIENT_ID;
  const authRedirectURI = process.env.APP_AUTH_REDIRECT_URI;

  invariant(
    appClientId,
    "APP_CLIENT_ID must be set in your environment variables."
  );
  invariant(
    authRedirectURI,
    "APP_AUTH_REDIRECT_URI must be set in your environment variables."
  );

  const authorizationParams = new URLSearchParams({
    client_id: appClientId,
    redirect_uri: authRedirectURI,
    scope: "user_profile,user_media",
    response_type: "code",
  });

  return redirect(
    `https://api.instagram.com/oauth/authorize?${authorizationParams}`
  );
};
