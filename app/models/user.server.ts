import { createClient } from "@supabase/supabase-js";
import invariant from "tiny-invariant";

export type User = {
  id: string;
  email: string;
};

// Abstract this away
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

invariant(
  supabaseUrl,
  "SUPABASE_URL must be set in your environment variables."
);
invariant(
  supabaseAnonKey,
  "SUPABASE_ANON_KEY must be set in your environment variables."
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error(`Error: createUser, ${email}, ***`, error);
    return null;
  }

  // Invalid: supabase error querying profile immediately after creation
  // get the user profile after created
  // const profile = await getProfileByEmail(user?.email);
  // return profile;

  return data.user?.id;
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, id")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error: getProfileById, ${id}`, error);
    return null;
  }

  if (data) {
    return { id: data.id, email: data.email };
  }

  return null;
}

export async function getProfileByEmail(email?: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, id")
    .eq("email", email)
    .single();

  if (error) {
    console.error(`Error: getProfileByEmail, ${email}`, error);
    return null;
  }

  if (data) {
    return data;
  }

  return null;
}

export async function verifyLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`Error: verifyLogin, ${email}, ***`, error);
    return undefined;
  }

  const profile = await getProfileByEmail(data.user?.email);

  return profile;
}
