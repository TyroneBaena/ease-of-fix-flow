-- Create function to ensure profile has organization_id when contractor is created
CREATE OR REPLACE FUNCTION public.sync_contractor_profile_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- When a contractor is created or updated, ensure the profile has matching organization_id
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    UPDATE public.profiles 
    SET organization_id = NEW.organization_id,
        updated_at = now()
    WHERE id = NEW.user_id 
    AND (organization_id IS NULL OR organization_id != NEW.organization_id);
    
    -- Log the sync operation
    RAISE LOG 'Synced profile organization_id for user % to match contractor organization %', 
      NEW.user_id, NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically sync profile organization when contractor is modified
DROP TRIGGER IF EXISTS sync_contractor_profile_org ON public.contractors;
CREATE TRIGGER sync_contractor_profile_org
  AFTER INSERT OR UPDATE OF organization_id ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contractor_profile_organization();