
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Building, User, Phone, MapPin, Tag, X, Plus } from "lucide-react";
import { Contractor } from '@/types/contractor';
import { Badge } from '@/components/ui/badge';

interface ContractorFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  contractor: Partial<Contractor>;
  selectedContractorId?: string;
  isLoading: boolean;
  onContractorChange: (field: keyof Contractor, value: string) => void;
  onSpecialtiesChange: (specialties: string[]) => void;
  onSave: () => Promise<void>;
  ready?: boolean;
}

const ContractorFormDialog = ({
  isOpen,
  onOpenChange,
  isEditMode,
  contractor,
  selectedContractorId,
  isLoading,
  onContractorChange,
  onSpecialtiesChange,
  onSave,
  ready = true
}: ContractorFormDialogProps) => {
  const [specialty, setSpecialty] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Reset errors when dialog opens/closes
    if (isOpen) {
      setFormErrors({});
      setSpecialty('');
    }
  }, [isOpen]);
  
  const addSpecialty = () => {
    if (!specialty.trim()) return;
    
    const currentSpecialties = contractor.specialties || [];
    if (currentSpecialties.includes(specialty.trim())) {
      setFormErrors(prev => ({ ...prev, specialty: 'This specialty is already added' }));
      return;
    }
    
    onSpecialtiesChange([...currentSpecialties, specialty.trim()]);
    setSpecialty('');
    setFormErrors(prev => ({ ...prev, specialty: '' }));
  };
  
  const removeSpecialty = (specialtyToRemove: string) => {
    const updatedSpecialties = (contractor.specialties || [])
      .filter(s => s !== specialtyToRemove);
    onSpecialtiesChange(updatedSpecialties);
  };
  
  const handleSave = async () => {
    // Check if component is ready
    if (!ready) {
      setFormErrors({ general: 'Please wait for the form to initialize...' });
      return;
    }
    
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!contractor.companyName?.trim()) {
      errors.companyName = 'Company name is required';
    }
    
    if (!contractor.contactName?.trim()) {
      errors.contactName = 'Contact name is required';
    }
    
    if (!contractor.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(contractor.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!contractor.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Clear errors and save
    setFormErrors({});
    await onSave();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Contractor' : 'Invite New Contractor'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="companyName" className="flex items-center">
              <Building className="h-4 w-4 mr-1" />
              Company Name
            </Label>
            <Input
              id="companyName"
              value={contractor.companyName || ''}
              onChange={(e) => onContractorChange('companyName', e.target.value)}
              placeholder="ABC Contracting"
              className={formErrors.companyName ? 'border-red-500' : ''}
              disabled={!ready}
            />
            {formErrors.companyName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.companyName}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="contactName" className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              Contact Person
            </Label>
            <Input
              id="contactName"
              value={contractor.contactName || ''}
              onChange={(e) => onContractorChange('contactName', e.target.value)}
              placeholder="John Doe"
              className={formErrors.contactName ? 'border-red-500' : ''}
              disabled={!ready}
            />
            {formErrors.contactName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.contactName}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={contractor.email || ''}
              onChange={(e) => onContractorChange('email', e.target.value)}
              placeholder="contractor@example.com"
              className={formErrors.email ? 'border-red-500' : ''}
              disabled={!ready}
            />
            {formErrors.email && (
              <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="phone" className="flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              Phone
            </Label>
            <Input
              id="phone"
              value={contractor.phone || ''}
              onChange={(e) => onContractorChange('phone', e.target.value)}
              placeholder="(123) 456-7890"
              className={formErrors.phone ? 'border-red-500' : ''}
              disabled={!ready}
            />
            {formErrors.phone && (
              <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="address" className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Address (Optional)
            </Label>
            <Textarea
              id="address"
              value={contractor.address || ''}
              onChange={(e) => onContractorChange('address', e.target.value)}
              placeholder="123 Main St, City, State, ZIP"
              rows={2}
              disabled={!ready}
            />
          </div>
          
          <div className="grid gap-2">
            <Label className="flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              Specialties
            </Label>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {(contractor.specialties || []).map((specialty, index) => (
                <Badge key={index} variant="secondary" className="pl-2">
                  {specialty}
                  <button 
                    type="button"
                    onClick={() => removeSpecialty(specialty)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(contractor.specialties || []).length === 0 && (
                <span className="text-muted-foreground text-xs">No specialties added yet</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  if (formErrors.specialty) {
                    setFormErrors(prev => ({ ...prev, specialty: '' }));
                  }
                }}
                placeholder="Add specialty (e.g., Plumbing)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                className={formErrors.specialty ? 'border-red-500' : ''}
              />
              <Button 
                type="button" 
                size="sm"
                onClick={addSpecialty}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formErrors.specialty && (
              <p className="text-red-500 text-xs mt-1">{formErrors.specialty}</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !ready}
            className="min-w-[100px]"
          >
            {!ready ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Saving...' : 'Inviting...'}
              </>
            ) : (
              isEditMode ? 'Save Changes' : 'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractorFormDialog;
