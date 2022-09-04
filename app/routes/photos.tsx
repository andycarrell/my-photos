import { json, redirect } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { getTokenByUserId } from "~/models/token.server";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";

type Media = {
  id: string;
  media_type: "IMAGE" | "CAROUSEL_ALBUM" | string;
  media_url: string;
  caption: string;
  timestamp: string;
};

type LoaderData = {
  media: Media[];
};

export async function loader({ request }: LoaderArgs) {
  const appClientId = process.env.APP_CLIENT_ID;
  const authRedirectURI = process.env.AUTH_REDIRECT_URI;
  const tokenAuthorizationURL = `https://api.instagram.com/oauth/authorize?client_id=${appClientId}&redirect_uri=${authRedirectURI}&scope=user_profile,user_media&response_type=code`;

  const userId = await requireUserId(request);
  const token = await getTokenByUserId({ userId });

  if (!token) {
    return redirect(tokenAuthorizationURL);
  }

  const params = new URLSearchParams({
    access_token: token.accessToken,
    fields: "media_type,media_url,id,timestamp,caption",
  });

  const response = await fetch(
    `https://graph.instagram.com/v14.0/${token.userId}/media?${params}`
  );

  const { data: media, error } = await response.json();

  if (response.ok) {
    return json({ media });
  }

  // https://developers.facebook.com/docs/graph-api/guides/error-handling/
  const isTokenInvalid =
    error?.code === 190 ||
    error?.code == 102 ||
    (!error?.code && error?.type === "OAuthException");

  if (isTokenInvalid) {
    return redirect(tokenAuthorizationURL);
  }

  return json(`Exception: could not fetch media for user, ${userId}`, {
    status: 500,
  });
}

function Header() {
  const user = useUser();
  return (
    <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
      <h1 className="text-3xl font-bold">
        <Link to=".">Photos</Link>
      </h1>
      <p>{user.email}</p>
      <Form action="/logout" method="post">
        <button
          type="submit"
          className="rounded bg-slate-600 py-2 px-4 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
        >
          Logout
        </button>
      </Form>
    </header>
  );
}

export default function NotesPage() {
  const data = useLoaderData<typeof loader>() as LoaderData;

  if (!data.media) {
    return (
      <div className="flex h-full min-h-screen flex-col">
        <Header />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <Header />
      <div className="grid grid-cols-3 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-6">
        {data.media.map(({ media_url: url, caption }) => (
          <img
            src={url}
            key={url}
            alt={caption}
            className="aspect-square h-full w-full rounded-md"
          />
        ))}
      </div>
    </div>
  );
}
