-- v39: new trek and paragliding partners start at 25% commission (Partner Agreement v2026-10-v2),
-- instead of showing the old 20% default until they sign. Same function as v15, plus commission_pct.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('user','partner') THEN NEW.raw_user_meta_data->>'role' ELSE 'partner' END;
  t TEXT := CASE WHEN NEW.raw_user_meta_data->>'partner_type' IN ('hotel','paragliding','taxi','trek') THEN NEW.raw_user_meta_data->>'partner_type' ELSE 'hotel' END;
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone, business_name, partner_type, partner_status, commission_pct)
  VALUES (
    NEW.id, NEW.email, r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    CASE WHEN r = 'partner' THEN t END,
    CASE WHEN r = 'partner' AND t <> 'hotel' THEN 'onboarding' END,
    CASE WHEN r = 'partner' AND t IN ('trek','paragliding') THEN 25 ELSE 20 END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Partners who signed up after v36 (e.g. Inderunaag adventure) still show 20%: move them too.
UPDATE profiles SET commission_pct = 25
WHERE role = 'partner' AND partner_type IN ('trek', 'paragliding') AND commission_pct = 20;
