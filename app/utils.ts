import { useMemo } from "react";
import { useMatches } from "@remix-run/react";
import type { User } from "./models/user.server";

export function useMatchesData(id: string) {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id]
  );

  return route?.data;
}

export function isUser(user: unknown): user is User {
  return Boolean(user) && typeof user === "object";
}

export function useOptionalUser() {
  const data = useMatchesData("root");

  if (data && isUser(data.user)) {
    return data.user;
  }

  return undefined;
}

export function useUser() {
  const maybeUser = useOptionalUser();

  if (maybeUser) {
    return maybeUser;
  }

  throw new Error(
    "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
  );
}

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@");
}
