
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MaintenanceRequest } from '@/types/maintenance';
import { useEditRequest } from '@/hooks/useEditRequest';

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  onRequestUpdated: () => void;
}

export const EditRequestDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  onRequestUpdated 
}: EditRequestDialogProps) => {
  const { updateRequest, isUpdating } = useEditRequest();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    location: '',
    issueNature: '',
    explanation: '',
    attemptedFix: '',
    isParticipantRelated: false,
    participantName: '',
    reportDate: '',
    submittedBy: ''
  });

  // Initialize form data when request changes
  useEffect(() => {
    if (request) {
      setFormData({
        title: request.title || '',
        description: request.description || '',
        category: request.category || '',
        priority: (request.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        location: request.location || '',
        issueNature: request.issueNature || '',
        explanation: request.explanation || '',
        attemptedFix: request.attemptedFix || '',
        isParticipantRelated: request.isParticipantRelated || false,
        participantName: request.participantName || '',
        reportDate: request.reportDate || '',
        submittedBy: request.submittedBy || ''
      });
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedRequest = await updateRequest(request.id, formData);
    
    if (updatedRequest) {
      onRequestUpdated();
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Request</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="issueNature">Issue Nature</Label>
            <Input
              id="issueNature"
              value={formData.issueNature}
              onChange={(e) => handleInputChange('issueNature', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="attemptedFix">Attempted Fix</Label>
            <Textarea
              id="attemptedFix"
              value={formData.attemptedFix}
              onChange={(e) => handleInputChange('attemptedFix', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isParticipantRelated"
              checked={formData.isParticipantRelated}
              onCheckedChange={(checked) => handleInputChange('isParticipantRelated', checked)}
            />
            <Label htmlFor="isParticipantRelated">Participant Related</Label>
          </div>

          {formData.isParticipantRelated && (
            <div>
              <Label htmlFor="participantName">Participant Name</Label>
              <Input
                id="participantName"
                value={formData.participantName}
                onChange={(e) => handleInputChange('participantName', e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportDate">Report Date</Label>
              <Input
                id="reportDate"
                type="date"
                value={formData.reportDate}
                onChange={(e) => handleInputChange('reportDate', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="submittedBy">Submitted By</Label>
              <Input
                id="submittedBy"
                value={formData.submittedBy}
                onChange={(e) => handleInputChange('submittedBy', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
