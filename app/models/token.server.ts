import type { User as Profile } from "./user.server";
import { supabase } from "./user.server";

export type Token = {
  id: string;
  user_id: string;
  access_token: string;
  profile_id: Profile["id"];
};

export async function saveToken({
  profileId,
  user_id: userId,
  access_token: accessToken,
}: Pick<Token, "access_token" | "user_id"> & { profileId: Profile["id"] }) {
  const { data, error } = await supabase
    .from("tokens")
    .upsert(
      {
        user_id: userId,
        access_token: accessToken,
        profile_id: profileId,
      },
      { onConflict: "profile_id" }
    )
    .single();

  if (error) {
    console.error("Error: saveToken", error);
    return null;
  }

  return data;
}

export async function getTokenByUserId({ userId }: { userId: Profile["id"] }) {
  const { data, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("profile_id", userId)
    .single();

  if (error) {
    console.error(`Error: getTokenByUserId, ${userId}`, error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    accessToken: data.access_token,
    profileId: data.profile_id,
  };
}
