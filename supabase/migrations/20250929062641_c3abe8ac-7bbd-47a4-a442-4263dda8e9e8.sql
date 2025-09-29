-- Recreate the trigger since it wasn't properly created
DROP TRIGGER IF EXISTS sync_property_count_trigger ON properties;
CREATE TRIGGER sync_property_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_count_to_subscriber();