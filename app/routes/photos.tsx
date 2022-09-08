import { useState, useEffect, useReducer } from "react";
import type { ReactNode } from "react";

import {
  Form,
  Link,
  useCatch,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";

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

export const meta: MetaFunction = () => {
  return {
    title: "Photos",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  const userId = await requireUserId(request);
  const token = await getTokenByUserId({ userId });

  if (!token) {
    return redirect("/fb-app/authorize");
  }

  const params = new URLSearchParams({
    access_token: token.accessToken,
    fields: "media_type,media_url,id,timestamp,caption",
    after: after ?? "",
    limit: "48",
  });

  const response = await fetch(
    `https://graph.instagram.com/v14.0/me/media?${params}`
  );

  const { data: media, paging, error } = await response.json();

  if (response.ok) {
    return json({
      // Explicitly ignore video for now
      media: media.filter((m: Media) => m.media_type !== "VIDEO"),
      after: paging?.next ? paging?.cursors?.after : null,
    });
  }

  console.error(`Exception: could not fetch media for user, ${userId}`, error);

  // https://developers.facebook.com/docs/graph-api/guides/error-handling/
  const isTokenInvalid =
    error?.code === 102 ||
    error?.code === 190 ||
    (!error?.code && error?.type === "OAuthException");

  if (isTokenInvalid) {
    return redirect("/fb-app/authorize");
  }

  // https://developers.facebook.com/docs/instagram-basic-display-api/reference/error-codes/
  if (
    error?.code === 100 &&
    error?.error_subcode === 33 &&
    error?.type === "IGApiException"
  ) {
    throw json(
      `Exception: could not fetch media for user, ${userId}. ${error?.message}`,
      { status: 400 }
    );
  }

  throw json(`Exception: could not fetch media for user, ${userId}`, {
    status: 500,
  });
};

function Header() {
  const user = useUser();
  return (
    <header className="flex w-full items-center justify-between bg-slate-800 p-4 text-white">
      <div className="grid grid-flow-row items-center sm:grid-flow-col sm:gap-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          <Link to=".">Photos</Link>
        </h1>
        <p className="text-sm sm:text-lg">{user.email}</p>
      </div>
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

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      role="presentation"
      className={className}
    >
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

function DownloadMedia({
  media,
  children,
}: {
  media: Media;
  children: ReactNode;
}) {
  const [href, setHref] = useState(media.media_url);
  const [isLoaded, setIsLoaded] = useReducer(() => true, false);

  const fetchHref = async () => {
    try {
      const image = await fetch(media.media_url);
      const imageBlob = await image.blob();
      const imagePNG = new Blob([imageBlob], { type: "image/png" });
      const imageURL = URL.createObjectURL(imagePNG);
      setHref(imageURL);
    } catch (e: unknown) {
      console.error("Exception: could not fetch href for media", e);
    }
  };

  return (
    <a
      href={href}
      onLoad={setIsLoaded}
      onMouseEnter={fetchHref}
      onTouchStart={fetchHref}
      download={`${media.id}.png`}
      aria-label={`Download ${media.id}`}
      className={[
        "group relative aspect-square h-full w-full overflow-hidden rounded-md",
        "cursor-pointer",
        isLoaded ? "" : "lg:after:hidden",
        "lg:after:absolute lg:after:inset-0 lg:after:z-10 lg:after:block",
        "lg:after:bg-transparent lg:hover:after:bg-gray-900/50",
        "lg:after:transition-colors lg:after:duration-300",
      ].join(" ")}
    >
      {children}
      <DownloadIcon
        className={[
          isLoaded ? "" : "hidden",
          "absolute z-20 h-8 w-8 ",
          "text-transparent lg:group-hover:text-white/90",
          "lg:transition-colors lg:duration-300",
          "inset-1/2 -translate-x-1/2 -translate-y-1/2", // <- center
        ].join(" ")}
      />
    </a>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  return (
    <div className="flex h-full min-h-screen flex-col items-center">
      <Header />
      <div className="mt-32 flex flex-col items-center space-y-4">
        <h2 className="text-3xl">Something went wrong</h2>
        <p>Please contact support, code: {caught.status}</p>
      </div>
    </div>
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
      <div className="grid w-full auto-rows-fr grid-cols-3 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-6">
        {data.media.map((media) => (
          <DownloadMedia key={media.id} media={media}>
            <img
              loading="lazy"
              alt={media.caption}
              src={media.media_url}
              className="h-full w-full object-cover"
            />
          </DownloadMedia>
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
