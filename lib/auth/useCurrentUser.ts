"use client";

// THE single source of truth for the current user and their role.
//
// Every auth-aware surface (header menu, account page, marketplace auth gate)
// should read identity from this hook instead of re-implementing session +
// profile + role checks. It returns:
//   - the Supabase auth user
//   - the application profile (created on first authenticated load if missing)
//   - the role ('elder' | 'admin') and derived caregiver capability
//
// Caregiver is NOT a role: it is the existence of an approved caregiver_profiles
// row (universal account model). `isCaregiver` reflects that.

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ensureElderProfile,
  loadIsCaregiver,
  type AccountProfile,
  type AccountRole,
} from "@/lib/auth/account";

export type AuthStatus =
  | "loading"
  | "signed-in"
  | "signed-out"
  | "unconfigured";

export type CurrentUser = {
  status: AuthStatus;
  user: User | null;
  profile: AccountProfile | null;
  role: AccountRole | null;
  isElder: boolean;
  isAdmin: boolean;
  isCaregiver: boolean;
  /** A profile-load/setup error message, if any (separate from session state). */
  profileError: string | null;
  /** Env-config error message when Supabase keys are missing. */
  envError: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<{ errorMessage: string | null }>;
};

export function useCurrentUser(): CurrentUser {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadForUser = useCallback(async (currentUser: User) => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const { profile: loadedProfile, errorMessage } = await ensureElderProfile(
      supabase,
      currentUser,
    );

    if (!mountedRef.current) {
      return;
    }

    setProfile(loadedProfile);
    setProfileError(errorMessage);

    if (loadedProfile) {
      const caregiver = await loadIsCaregiver(supabase, currentUser.id);
      if (mountedRef.current) {
        setIsCaregiver(caregiver);
      }
    } else {
      setIsCaregiver(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { supabase, envError: configError } = getSupabaseBrowserClient();

    if (configError || !supabase) {
      setStatus("unconfigured");
      setEnvError(configError);
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!mountedRef.current) {
      return;
    }

    if (data.user) {
      setStatus("signed-in");
      setUser(data.user);
      await loadForUser(data.user);
    } else {
      setStatus("signed-out");
      setUser(null);
      setProfile(null);
      setIsCaregiver(false);
      setProfileError(null);
    }
  }, [loadForUser]);

  const signOut = useCallback(async () => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return { errorMessage: envError };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return { errorMessage: error.message };
    }

    if (mountedRef.current) {
      setStatus("signed-out");
      setUser(null);
      setProfile(null);
      setIsCaregiver(false);
      setProfileError(null);
    }

    return { errorMessage: null };
  }, [envError]);

  useEffect(() => {
    mountedRef.current = true;
    const { supabase, envError: configError } = getSupabaseBrowserClient();

    if (configError || !supabase) {
      setStatus("unconfigured");
      setEnvError(configError);
      return;
    }

    // Safety net: never leave the UI stuck on "loading" if the session lookup
    // hangs or rejects (network/CORS). Fall back to signed-out within ~1s.
    const loadingFallback = setTimeout(() => {
      if (mountedRef.current) {
        setStatus((current) => (current === "loading" ? "signed-out" : current));
      }
    }, 1000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mountedRef.current) {
          return;
        }

        if (data.session?.user) {
          setStatus("signed-in");
          setUser(data.session.user);
          void loadForUser(data.session.user);
        } else {
          setStatus("signed-out");
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setStatus("signed-out");
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) {
        return;
      }

      if (session?.user) {
        setStatus("signed-in");
        setUser(session.user);
        void loadForUser(session.user);
      } else {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setIsCaregiver(false);
        setProfileError(null);
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(loadingFallback);
      subscription.unsubscribe();
    };
  }, [loadForUser]);

  const role = profile?.role ?? null;

  return {
    status,
    user,
    profile,
    role,
    isElder: role === "elder",
    isAdmin: role === "admin",
    isCaregiver,
    profileError,
    envError,
    refresh,
    signOut,
  };
}
