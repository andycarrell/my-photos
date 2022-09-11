import invariant from "tiny-invariant";

import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";

import { requireUserId } from "~/session.server";
import { saveToken } from "~/models/token.server";

export const loader: LoaderFunction = async ({ request }) => {
  const appClientId = process.env.APP_CLIENT_ID;
  const appClientSecret = process.env.APP_CLIENT_SECRET;
  const authRedirectURI = process.env.APP_AUTH_REDIRECT_URI;

  invariant(
    appClientId,
    "APP_CLIENT_ID must be set in your environment variables."
  );
  invariant(
    appClientSecret,
    "APP_CLIENT_SECRET must be set in your environment variables."
  );
  invariant(
    authRedirectURI,
    "APP_AUTH_REDIRECT_URI must be set in your environment variables."
  );

  const userId = await requireUserId(request);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return json("Exception: You must provide a valid 'code'", { status: 400 });
  }

  // 'consume' code
  url.searchParams.delete("code");

  const tokenResponse = await fetch(
    "https://api.instagram.com/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: String(
        new URLSearchParams({
          code,
          client_id: appClientId,
          client_secret: appClientSecret,
          redirect_uri: authRedirectURI,
          grant_type: "authorization_code",
        })
      ),
    }
  );

  const token = await tokenResponse.json();

  await saveToken({
    profileId: userId,
    access_token: token.access_token,
    user_id: token.user_id,
  });

  return redirect("/photos");
};
