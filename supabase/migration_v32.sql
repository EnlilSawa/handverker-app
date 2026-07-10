-- Migration v32: Send innlogging på nytt til en ALLEREDE opprettet kunde.
-- superadmin_reset_company_login() tilbakestiller firma-adminens passord til et
-- nytt midlertidig passord (auth.users lagrer kun hash → det gamle kan ikke hentes)
-- og returnerer e-post + firmanavn + kontaktnavn, slik at klienten kan sende
-- innloggings-e-posten (send-customer-invite) på nytt. Kun superadmin.
-- Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.superadmin_reset_company_login(
  p_company_id uuid,
  p_password   text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id uuid;
  v_email   text;
  v_name    text;
  v_company text;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Ikke autorisert';
  END IF;
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'Passordet må ha minst 8 tegn';
  END IF;

  SELECT name INTO v_company FROM companies WHERE id = p_company_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Fant ikke firmaet';
  END IF;

  -- Firmaets admin (eldste hvis flere) = innloggingskontoen.
  SELECT p.id, p.email, p.name
    INTO v_user_id, v_email, v_name
  FROM profiles p
  WHERE p.company_id = p_company_id AND p.role = 'admin'
  ORDER BY p.created_at NULLS LAST
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Fant ingen admin-bruker for firmaet';
  END IF;

  -- E-post kan mangle på profilen (eldre data) → fall tilbake til auth.users.
  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;
  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Admin-brukeren mangler en gyldig e-post';
  END IF;

  -- Sett nytt midlertidig passord (det gamle slutter å virke).
  UPDATE auth.users
     SET encrypted_password = crypt(p_password, gen_salt('bf')),
         updated_at = now()
   WHERE id = v_user_id;

  RETURN json_build_object(
    'email', v_email,
    'company_name', v_company,
    'contact_name', v_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.superadmin_reset_company_login(uuid, text) TO authenticated;
