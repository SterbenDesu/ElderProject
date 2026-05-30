-- Admin-only helper application review RPC.
-- Applies helper review actions atomically from the database so browser clients
-- do not directly coordinate role changes, helper profile writes, and audit logs.

create or replace function public.review_helper_application(
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
  v_application public.helper_applications%rowtype;
  v_applicant_profile public.profiles%rowtype;
  v_old_status text;
  v_new_status text;
  v_helper_profile_bio text;
  v_helper_profile_id uuid;
  v_audit_logged boolean := false;
  v_audit_error text := null;
begin
  if v_actor_id is null then
    raise exception 'Admin helper review requires an authenticated user.'
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
    raise exception 'Only admins can review helper applications.'
      using errcode = '42501';
  end if;

  v_new_status := lower(trim(coalesce(p_action, '')));

  if v_new_status not in ('under_review', 'approved', 'rejected') then
    raise exception 'Invalid helper application review action: %. Use under_review, approved, or rejected.', coalesce(p_action, '<null>')
      using errcode = '22023';
  end if;

  select *
  into v_application
  from public.helper_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Helper application not found: %.', p_application_id
      using errcode = 'P0002';
  end if;

  v_old_status := v_application.status;

  select *
  into v_applicant_profile
  from public.profiles
  where id = v_application.profile_id
  for update;

  if not found then
    raise exception 'Applicant profile is missing for helper application %.', p_application_id
      using errcode = 'P0002';
  end if;

  if v_applicant_profile.id = v_actor_id then
    raise exception 'Admins cannot review their own helper application.'
      using errcode = '42501';
  end if;

  if v_new_status = 'approved' then
    update public.profiles
    set role = 'verified_helper'
    where id = v_applicant_profile.id;

    v_helper_profile_bio := left(
      coalesce(nullif(trim(v_application.experience_summary), ''), trim(v_application.motivation)),
      500
    );

    insert into public.helper_profiles (
      profile_id,
      verification_status,
      bio,
      city,
      is_visible
    )
    values (
      v_application.profile_id,
      'verified_basic',
      v_helper_profile_bio,
      trim(v_application.city),
      false
    )
    on conflict (profile_id) do update
    set verification_status = 'verified_basic',
        bio = excluded.bio,
        city = excluded.city,
        is_visible = false
    returning id into v_helper_profile_id;
  end if;

  update public.helper_applications
  set status = v_new_status
  where id = v_application.id
  returning * into v_application;

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
      'helper_application_reviewed',
      'helper_applications',
      v_application.id,
      jsonb_build_object(
        'old_status', v_old_status,
        'new_status', v_new_status,
        'applicant_profile_id', v_application.profile_id,
        'helper_profile_id', v_helper_profile_id
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
    'action', v_new_status,
    'application', jsonb_build_object(
      'id', v_application.id,
      'profile_id', v_application.profile_id,
      'status', v_application.status,
      'full_name', v_application.full_name,
      'city', v_application.city,
      'motivation', v_application.motivation,
      'experience_summary', v_application.experience_summary,
      'availability_summary', v_application.availability_summary,
      'created_at', v_application.created_at,
      'updated_at', v_application.updated_at
    ),
    'profile_role', case when v_new_status = 'approved' then 'verified_helper' else v_applicant_profile.role end,
    'helper_profile_id', v_helper_profile_id,
    'helper_profile_is_visible', case when v_new_status = 'approved' then false else null end,
    'audit_logged', v_audit_logged,
    'audit_error', v_audit_error
  );
end;
$$;

revoke all on function public.review_helper_application(uuid, text) from public;
grant execute on function public.review_helper_application(uuid, text) to authenticated;

comment on function public.review_helper_application(uuid, text) is 'Admin-only RPC for reviewing helper applications. Approvals update the applicant role and create/update a hidden verified_basic helper profile without using service role keys in the browser.';
