import { useState, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";

import { getTokenByUserId } from "~/models/token.server";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";

type Media = {
  id: string;
  media_type: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO" | string;
  media_url: string;
  caption: string;
  timestamp: string;
};

type LoaderData = {
  media: Media[];
  after: string | null;
};

export async function loader({ request }: LoaderArgs) {
  const appClientId = process.env.APP_CLIENT_ID;
  const authRedirectURI = process.env.AUTH_REDIRECT_URI;
  const tokenAuthorizationURL = `https://api.instagram.com/oauth/authorize?client_id=${appClientId}&redirect_uri=${authRedirectURI}&scope=user_profile,user_media&response_type=code`;

  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  const userId = await requireUserId(request);
  const token = await getTokenByUserId({ userId });

  if (!token) {
    return redirect(tokenAuthorizationURL);
  }

  const params = new URLSearchParams({
    access_token: token.accessToken,
    fields: "media_type,media_url,id,timestamp,caption",
    after: after ?? "",
    limit: "50",
  });

  const response = await fetch(
    `https://graph.instagram.com/v14.0/${token.userId}/media?${params}`
  );

  const { data: media, paging, error } = await response.json();

  if (response.ok) {
    return json({
      // Explicitly ignore video for now
      media: media.filter((m: Media) => m.media_type !== "VIDEO"),
      after: paging?.next ? paging?.cursors?.after : null,
    });
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
    <header className="flex w-full items-center justify-between bg-slate-800 p-4 text-white">
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

function LoadMoreButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={[
        "flex w-full items-center justify-center",
        "px-4 py-3 font-medium text-white",
        "rounded-md bg-violet-500",
        disabled ? "opacity-60" : "hover:bg-violet-600",
      ].join(" ")}
    >
      Load more
    </button>
  );
}

export default function PhotosPage() {
  const initialData = useLoaderData<typeof loader>() as LoaderData;
  const [data, setData] = useState(initialData);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data) {
      setData((previous) => ({
        media: [...previous.media, ...(fetcher.data.media ?? [])],
        after: fetcher.data.after,
      }));
    }
  }, [fetcher.data]);

  if (!data.media) {
    return (
      <div className="flex h-full min-h-screen flex-col">
        <Header />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center">
      <Header />
      <div className="grid auto-rows-fr grid-cols-3 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-6">
        {data.media.map(({ id, media_url: url, caption }) => (
          <div className="aspect-square h-full w-full" key={id}>
            <img
              src={url}
              key={url}
              alt={caption}
              className="h-full w-full rounded-md object-cover"
            />
          </div>
        ))}
      </div>
      {data.after ? (
        <div className="w-full p-4 md:w-64">
          <fetcher.Form method="get" action={`?after=${data.after}`}>
            <LoadMoreButton disabled={fetcher.state !== "idle"} />
          </fetcher.Form>
        </div>
      ) : null}
    </div>
  );
}
