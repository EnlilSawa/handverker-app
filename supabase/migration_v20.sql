-- Migration v20: Robust sletting av teammedlem (fikser "tekniker kommer tilbake")
-- Kjør i Supabase SQL Editor. Idempotent (CREATE OR REPLACE).
--
-- BUG:
--   removeTechnician gjorde `delete from profiles where id = ...` og sjekket ALDRI
--   feilen. jobs.assigned_technician_id → profiles(id) er ON DELETE NO ACTION, så
--   hvis teknikeren hadde EN tildelt jobb feilet slettingen (FK 23503). Feilen ble
--   svelget, UI fjernet raden lokalt, men DB beholdt den → teknikeren kom tilbake
--   ved neste innlogging/last. I tillegg ble auth.users-raden aldri slettet
--   (foreldreløs konto — kunne fortsatt logge inn).
--
-- FIX:
--   SECURITY DEFINER-RPC som atomisk: (1) verifiserer at kalleren er admin og at
--   målet er i SAMME firma (og ikke seg selv), (2) løsner teknikeren fra alle
--   jobber (assigned_technician_id = NULL — jobbene beholdes, bare frigjort),
--   (3) sletter profilen, (4) sletter auth.users-raden (auth.identities/sessions
--   cascader). Profiles har ikke lenger FK til auth.users (droppet i v4), derfor
--   må begge slettes eksplisitt.

CREATE OR REPLACE FUNCTION remove_technician(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_company_id     UUID;
  v_target_company UUID;
BEGIN
  -- 1. Kalleren må være admin i et firma
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Kun admin kan fjerne teammedlemmer';
  END IF;

  -- 2. Kan ikke fjerne seg selv
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Du kan ikke fjerne deg selv';
  END IF;

  -- 3. Målet må finnes og tilhøre kallerens firma
  SELECT company_id INTO v_target_company
  FROM profiles
  WHERE id = p_user_id;

  IF v_target_company IS NULL OR v_target_company <> v_company_id THEN
    RAISE EXCEPTION 'Teammedlemmet finnes ikke i ditt firma';
  END IF;

  -- 4. Løsne fra ALLE jobber som refererer teknikeren (unngår FK-brudd; jobbene
  --    beholdes som «ikke tildelt»). VIKTIG: ikke filtrer på company_id her —
  --    historiske data kan ha jobber i et ANNET firma som fortsatt peker på denne
  --    teknikeren (kryss-firma-tildelinger fra før RLS-fiksen i v16). Filtreres de
  --    bort, blir referansen stående og DELETE under feiler på FK
  --    (jobs_assigned_technician_id_fkey). Teknikeren er allerede entydig
  --    identifisert av p_user_id, og vi har verifisert at de tilhører kallerens
  --    firma, så det er trygt å nulle ut enhver dinglende referanse.
  UPDATE jobs
    SET assigned_technician_id = NULL
    WHERE assigned_technician_id = p_user_id;

  -- 5. Slett profilen
  DELETE FROM profiles WHERE id = p_user_id;

  -- 6. Slett auth-brukeren (ellers foreldreløs konto som fortsatt kan logge inn).
  --    auth.identities/sessions/refresh_tokens cascader via sine egne FK-er.
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_technician(UUID) TO authenticated;
