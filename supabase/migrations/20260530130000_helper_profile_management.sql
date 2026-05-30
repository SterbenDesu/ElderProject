-- Verified helper profile management and admin-controlled public visibility.
-- Browser clients still use only the public Supabase publishable key and normal user sessions.
-- These RPCs keep helper self-edits limited to safe public fields and keep public visibility admin-only.

create or replace function public.update_own_helper_profile(
  p_bio text,
  p_city text,
  p_service_radius_km integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile_role text;
  v_helper_profile public.helper_profiles%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Helper profile updates require an authenticated user.'
      using errcode = '28000';
  end if;

  select role
  into v_profile_role
  from public.profiles
  where id = v_actor_id;

  if not found then
    raise exception 'Profile row is missing for the signed-in user.'
      using errcode = 'P0002';
  end if;

  if v_profile_role <> 'verified_helper' then
    raise exception 'Only verified helpers can update helper profile public fields.'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_bio, ''))) < 20 then
    raise exception 'Bio must be at least 20 characters.'
      using errcode = '22023';
  end if;

  if length(trim(coalesce(p_city, ''))) < 2 then
    raise exception 'City is required.'
      using errcode = '22023';
  end if;

  if p_service_radius_km is not null and (p_service_radius_km < 0 or p_service_radius_km > 100) then
    raise exception 'Service radius must be between 0 and 100 km, or blank.'
      using errcode = '22023';
  end if;

  update public.helper_profiles
  set bio = trim(p_bio),
      city = trim(p_city),
      service_radius_km = p_service_radius_km
  where profile_id = v_actor_id
    and verification_status in ('verified_basic', 'trusted')
  returning * into v_helper_profile;

  if not found then
    raise exception 'Verified helper profile was not found or is not approved for editing.'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'helper_profile', jsonb_build_object(
      'id', v_helper_profile.id,
      'profile_id', v_helper_profile.profile_id,
      'verification_status', v_helper_profile.verification_status,
      'bio', v_helper_profile.bio,
      'city', v_helper_profile.city,
      'service_radius_km', v_helper_profile.service_radius_km,
      'is_visible', v_helper_profile.is_visible,
      'created_at', v_helper_profile.created_at,
      'updated_at', v_helper_profile.updated_at
    )
  );
end;
$$;

revoke all on function public.update_own_helper_profile(text, text, integer) from public;
grant execute on function public.update_own_helper_profile(text, text, integer) to authenticated;

comment on function public.update_own_helper_profile(text, text, integer) is 'Verified-helper-only RPC for editing safe public helper profile fields: bio, city, and service_radius_km. It does not allow helpers to edit verification_status, is_visible, role, profile_id, or admin-only fields.';

create or replace function public.set_helper_profile_visibility(
  p_helper_profile_id uuid,
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
  v_helper_profile public.helper_profiles%rowtype;
  v_old_is_visible boolean;
  v_audit_logged boolean := false;
  v_audit_error text := null;
begin
  if v_actor_id is null then
    raise exception 'Helper visibility changes require an authenticated admin user.'
      using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = v_actor_id
      and role = 'admin'
  )
  into v_is_admin;

  if not v_is_admin then
    raise exception 'Only admins can change public helper visibility.'
      using errcode = '42501';
  end if;

  select *
  into v_helper_profile
  from public.helper_profiles
  where id = p_helper_profile_id
  for update;

  if not found then
    raise exception 'Helper profile not found: %.', p_helper_profile_id
      using errcode = 'P0002';
  end if;

  if v_helper_profile.verification_status not in ('verified_basic', 'trusted') then
    raise exception 'Only verified helper profiles can be made public.'
      using errcode = '42501';
  end if;

  v_old_is_visible := v_helper_profile.is_visible;

  update public.helper_profiles
  set is_visible = p_is_visible
  where id = v_helper_profile.id
  returning * into v_helper_profile;

  begin
    insert into public.audit_logs (
      actor_id,
      action,
      target_table,
      target_id,
      metadata
    )
    values (
      v_actor_id,
      'helper_profile_visibility_changed',
      'helper_profiles',
      v_helper_profile.id,
      jsonb_build_object(
        'old_is_visible', v_old_is_visible,
        'new_is_visible', v_helper_profile.is_visible,
        'helper_profile_id', v_helper_profile.id,
        'helper_user_profile_id', v_helper_profile.profile_id,
        'verification_status', v_helper_profile.verification_status
      )
    );

    v_audit_logged := true;
  exception
    when others then
      v_audit_logged := false;
      v_audit_error := sqlerrm;
  end;

  return jsonb_build_object(
    'ok', true,
    'helper_profile', jsonb_build_object(
      'id', v_helper_profile.id,
      'profile_id', v_helper_profile.profile_id,
      'verification_status', v_helper_profile.verification_status,
      'bio', v_helper_profile.bio,
      'city', v_helper_profile.city,
      'service_radius_km', v_helper_profile.service_radius_km,
      'is_visible', v_helper_profile.is_visible,
      'created_at', v_helper_profile.created_at,
      'updated_at', v_helper_profile.updated_at
    ),
    'old_is_visible', v_old_is_visible,
    'new_is_visible', v_helper_profile.is_visible,
    'audit_logged', v_audit_logged,
    'audit_error', v_audit_error
  );
end;
$$;

revoke all on function public.set_helper_profile_visibility(uuid, boolean) from public;
grant execute on function public.set_helper_profile_visibility(uuid, boolean) to authenticated;

comment on function public.set_helper_profile_visibility(uuid, boolean) is 'Admin-only RPC for changing helper_profiles.is_visible with a best-effort audit_logs row. It does not weaken RLS or require service role keys in the browser.';
