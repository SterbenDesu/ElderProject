-- Rewrite the helper-era RPCs for the target caregiver model.
--
-- The three legacy RPCs referenced public.helper_profiles (now caregiver_profiles)
-- and the dropped 'verified_helper' role. Caregiver status is now derived from the
-- existence of an approved caregiver_profiles row, so approval no longer changes
-- profiles.role. These functions remain SECURITY DEFINER and re-check the caller —
-- the browser never uses a service-role key.

begin;

drop function if exists public.review_helper_application(uuid, text);
drop function if exists public.update_own_helper_profile(text, text, integer);
drop function if exists public.set_helper_profile_visibility(uuid, boolean);

-- ---------------------------------------------------------------------------
-- Admin-only: review a caregiver application. Approval creates/updates a hidden-
-- then-visible verified caregiver profile WITHOUT granting any new role.
-- ---------------------------------------------------------------------------
create or replace function public.review_caregiver_application(
  p_application_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_application public.caregiver_applications%rowtype;
  v_applicant_profile public.profiles%rowtype;
  v_old_status text;
  v_new_status text;
  v_bio text;
  v_display_name text;
  v_caregiver_profile_id uuid;
  v_audit_logged boolean := false;
  v_audit_error text := null;
begin
  if v_actor_id is null then
    raise exception 'Caregiver review requires an authenticated user.' using errcode = '28000';
  end if;

  select exists (select 1 from public.profiles where id = v_actor_id and role = 'admin') into v_is_admin;
  if not v_is_admin then
    raise exception 'Only admins can review caregiver applications.' using errcode = '42501';
  end if;

  v_new_status := lower(trim(coalesce(p_action, '')));
  if v_new_status not in ('under_review', 'approved', 'rejected') then
    raise exception 'Invalid review action: %. Use under_review, approved, or rejected.', coalesce(p_action, '<null>') using errcode = '22023';
  end if;

  select * into v_application from public.caregiver_applications where id = p_application_id for update;
  if not found then
    raise exception 'Caregiver application not found: %.', p_application_id using errcode = 'P0002';
  end if;
  v_old_status := v_application.status;

  select * into v_applicant_profile from public.profiles where id = v_application.profile_id for update;
  if not found then
    raise exception 'Applicant profile is missing for application %.', p_application_id using errcode = 'P0002';
  end if;
  if v_applicant_profile.id = v_actor_id then
    raise exception 'Admins cannot review their own caregiver application.' using errcode = '42501';
  end if;

  if v_new_status = 'approved' then
    v_bio := left(coalesce(nullif(trim(v_application.experience_summary), ''), trim(v_application.motivation)), 500);
    v_display_name := coalesce(nullif(trim(v_application.full_name), ''), v_applicant_profile.first_name, 'Caregiver');

    -- Caregiver capability is the existence of this approved row; role is unchanged.
    insert into public.caregiver_profiles (profile_id, verification_status, display_name, bio, is_visible)
    values (v_application.profile_id, 'verified_basic', v_display_name, v_bio, true)
    on conflict (profile_id) do update
      set verification_status = 'verified_basic',
          display_name = excluded.display_name,
          bio = excluded.bio,
          is_visible = true
    returning id into v_caregiver_profile_id;
  end if;

  update public.caregiver_applications set status = v_new_status where id = v_application.id returning * into v_application;

  begin
    insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
    values (v_actor_id, 'caregiver_application_reviewed', 'caregiver_applications', v_application.id,
      jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status,
                         'applicant_profile_id', v_application.profile_id,
                         'caregiver_profile_id', v_caregiver_profile_id));
    v_audit_logged := true;
  exception when others then
    v_audit_logged := false;
    v_audit_error := sqlerrm;
  end;

  return jsonb_build_object(
    'ok', true,
    'action', v_new_status,
    'application_id', v_application.id,
    'application_status', v_application.status,
    'caregiver_profile_id', v_caregiver_profile_id,
    'caregiver_profile_is_visible', case when v_new_status = 'approved' then true else null end,
    'audit_logged', v_audit_logged,
    'audit_error', v_audit_error
  );
end;
$$;

revoke all on function public.review_caregiver_application(uuid, text) from public;
grant execute on function public.review_caregiver_application(uuid, text) to authenticated;
comment on function public.review_caregiver_application(uuid, text) is
  'Admin-only RPC to review caregiver applications. Approval creates/updates a visible verified_basic caregiver_profiles row; it does NOT change profiles.role (caregiver capability = existence of this row).';

-- ---------------------------------------------------------------------------
-- Caregiver self-edit of safe public profile fields only. Cannot touch
-- verification_status, is_visible, badge, stripe_account_id, profile_id, ratings.
-- ---------------------------------------------------------------------------
create or replace function public.update_own_caregiver_profile(
  p_display_name text,
  p_bio text,
  p_experience text,
  p_covers_whole_city boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.caregiver_profiles%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Caregiver profile updates require an authenticated user.' using errcode = '28000';
  end if;

  if not public.is_caregiver(v_actor_id) then
    raise exception 'Only approved caregivers can update caregiver profile fields.' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_bio, ''))) < 20 then
    raise exception 'Bio must be at least 20 characters.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Display name is required.' using errcode = '22023';
  end if;

  update public.caregiver_profiles
     set display_name = trim(p_display_name),
         bio = trim(p_bio),
         experience = nullif(trim(coalesce(p_experience, '')), ''),
         covers_whole_city = coalesce(p_covers_whole_city, false)
   where profile_id = v_actor_id
     and verification_status in ('verified_basic', 'trusted')
  returning * into v_profile;

  if not found then
    raise exception 'Approved caregiver profile not found for editing.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'caregiver_profile', jsonb_build_object(
      'id', v_profile.id,
      'profile_id', v_profile.profile_id,
      'display_name', v_profile.display_name,
      'bio', v_profile.bio,
      'experience', v_profile.experience,
      'covers_whole_city', v_profile.covers_whole_city,
      'verification_status', v_profile.verification_status,
      'is_visible', v_profile.is_visible
    )
  );
end;
$$;

revoke all on function public.update_own_caregiver_profile(text, text, text, boolean) from public;
grant execute on function public.update_own_caregiver_profile(text, text, text, boolean) to authenticated;
comment on function public.update_own_caregiver_profile(text, text, text, boolean) is
  'Approved-caregiver-only RPC to edit safe public profile fields (display_name, bio, experience, covers_whole_city). Cannot edit verification_status, is_visible, badge, stripe_account_id, ratings, or profile_id.';

-- ---------------------------------------------------------------------------
-- Admin-only: toggle public visibility of a caregiver profile (audited).
-- ---------------------------------------------------------------------------
create or replace function public.set_caregiver_profile_visibility(
  p_caregiver_profile_id uuid,
  p_is_visible boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_profile public.caregiver_profiles%rowtype;
  v_old boolean;
begin
  if v_actor_id is null then
    raise exception 'Visibility changes require an authenticated admin user.' using errcode = '28000';
  end if;

  select exists (select 1 from public.profiles where id = v_actor_id and role = 'admin') into v_is_admin;
  if not v_is_admin then
    raise exception 'Only admins can change caregiver visibility.' using errcode = '42501';
  end if;

  select * into v_profile from public.caregiver_profiles where id = p_caregiver_profile_id for update;
  if not found then
    raise exception 'Caregiver profile not found: %.', p_caregiver_profile_id using errcode = 'P0002';
  end if;
  if v_profile.verification_status not in ('verified_basic', 'trusted') then
    raise exception 'Only verified caregiver profiles can be made public.' using errcode = '42501';
  end if;

  v_old := v_profile.is_visible;
  update public.caregiver_profiles set is_visible = p_is_visible where id = v_profile.id returning * into v_profile;

  begin
    insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
    values (v_actor_id, 'caregiver_profile_visibility_changed', 'caregiver_profiles', v_profile.id,
      jsonb_build_object('old_is_visible', v_old, 'new_is_visible', v_profile.is_visible,
                         'caregiver_user_profile_id', v_profile.profile_id,
                         'verification_status', v_profile.verification_status));
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'caregiver_profile_id', v_profile.id,
                            'old_is_visible', v_old, 'new_is_visible', v_profile.is_visible);
end;
$$;

revoke all on function public.set_caregiver_profile_visibility(uuid, boolean) from public;
grant execute on function public.set_caregiver_profile_visibility(uuid, boolean) to authenticated;
comment on function public.set_caregiver_profile_visibility(uuid, boolean) is
  'Admin-only RPC to change caregiver_profiles.is_visible with a best-effort audit log. Does not weaken RLS or use service-role keys.';

commit;
