
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { X, Plus, Award } from 'lucide-react';

interface ContractorProfile {
  id: string;
  specialties?: string[];
}

interface ManageSkillsDialogProps {
  contractor: ContractorProfile | null;
  onUpdate: () => void;
  children: React.ReactNode;
}

const commonSkills = [
  'Plumbing', 'Electrical', 'HVAC', 'Painting', 'Carpentry', 
  'Flooring', 'Roofing', 'Landscaping', 'Cleaning', 'Locksmith',
  'Appliance Repair', 'Drywall', 'Tile Work', 'Window Repair',
  'Pest Control', 'General Maintenance'
];

export const ManageSkillsDialog: React.FC<ManageSkillsDialogProps> = ({
  contractor,
  onUpdate,
  children
}) => {
  const { currentUser } = useUserContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (contractor && open) {
      console.log('ManageSkillsDialog - Setting initial skills from contractor:', contractor.specialties);
      setSkills(contractor.specialties || []);
    }
  }, [contractor, open]);

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      console.log('Adding skill:', trimmedSkill);
      setSkills([...skills, trimmedSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    console.log('Removing skill:', skillToRemove);
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleAddCommonSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      console.log('Adding common skill:', skill);
      setSkills([...skills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractor?.id) {
      console.error('ManageSkillsDialog - No contractor ID found');
      toast.error('Contractor profile not found');
      return;
    }

    console.log('ManageSkillsDialog - Starting update process:', {
      contractorId: contractor.id,
      currentSkills: contractor.specialties,
      newSkills: skills,
      skillsChanged: JSON.stringify(contractor.specialties) !== JSON.stringify(skills)
    });

    // Check if skills actually changed
    const skillsChanged = JSON.stringify(contractor.specialties?.sort()) !== JSON.stringify(skills.sort());
    if (!skillsChanged) {
      console.log('ManageSkillsDialog - No changes detected, closing dialog');
      toast.success('No changes to save');
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      console.log('ManageSkillsDialog - Executing database update');
      
      // First, let's verify the contractor exists
      const { data: existingContractor, error: fetchError } = await supabase
        .from('contractors')
        .select('id, specialties')
        .eq('id', contractor.id)
        .single();

      if (fetchError) {
        console.error('ManageSkillsDialog - Error fetching contractor for verification:', fetchError);
        throw fetchError;
      }

      console.log('ManageSkillsDialog - Existing contractor data:', existingContractor);

      // Now update the specialties
      const { data, error } = await supabase
        .from('contractors')
        .update({
          specialties: skills,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractor.id)
        .select('id, specialties, updated_at');

      if (error) {
        console.error('ManageSkillsDialog - Database update error:', error);
        throw error;
      }

      console.log('ManageSkillsDialog - Update successful, returned data:', data);

      // Verify the update actually happened
      const { data: verificationData, error: verificationError } = await supabase
        .from('contractors')
        .select('specialties, updated_at')
        .eq('id', contractor.id)
        .single();

      if (verificationError) {
        console.error('ManageSkillsDialog - Verification error:', verificationError);
      } else {
        console.log('ManageSkillsDialog - Post-update verification:', verificationData);
      }

      toast.success('Skills updated successfully');
      setOpen(false);
      
      console.log('ManageSkillsDialog - Calling onUpdate callback');
      // Call the update callback
      onUpdate();
      
    } catch (error: any) {
      console.error('ManageSkillsDialog - Error during update process:', error);
      toast.error(error.message || 'Failed to update skills');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = (newOpen: boolean) => {
    console.log('ManageSkillsDialog - Dialog open state changing to:', newOpen);
    setOpen(newOpen);
    if (!newOpen) {
      // Reset skills when closing dialog
      setSkills(contractor?.specialties || []);
      setNewSkill('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Manage Skills & Services
          </DialogTitle>
          <DialogDescription>
            Add or remove your specialties to help clients find the right contractor for their needs.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Skills */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Your Skills</Label>
            <div className="flex flex-wrap gap-2 min-h-[50px] p-3 border rounded-md bg-gray-50">
              {skills.length > 0 ? (
                skills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No skills added yet</span>
              )}
            </div>
          </div>

          {/* Add Custom Skill */}
          <div className="space-y-3">
            <Label htmlFor="newSkill">Add Custom Skill</Label>
            <div className="flex gap-2">
              <Input
                id="newSkill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Enter a skill or service"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              />
              <Button
                type="button"
                onClick={handleAddSkill}
                disabled={!newSkill.trim() || skills.includes(newSkill.trim())}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Common Skills */}
          <div className="space-y-3">
            <Label>Quick Add - Common Skills</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {commonSkills.map((skill) => (
                <Button
                  key={skill}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCommonSkill(skill)}
                  disabled={skills.includes(skill)}
                  className="justify-start text-sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {skill}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Skills'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
