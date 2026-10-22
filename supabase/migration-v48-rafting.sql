-- migration-v48: river rafting as an activity type next to paragliding, zipline, sky cycle and ATV. Run once in the SQL editor. Safe to re-run.
ALTER TABLE paragliding_packages DROP CONSTRAINT IF EXISTS paragliding_packages_package_type_check;
ALTER TABLE paragliding_packages ADD CONSTRAINT paragliding_packages_package_type_check
  CHECK (package_type IN ('tandem','solo','course','scenic','acrobatic','zipline','sky_cycle','atv','rafting'));
