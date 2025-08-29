
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Slider
} from '@/components/ui/slider';
import { useContractorContext } from '@/contexts/contractor';
import { Check, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { InvoiceUploadDialog } from './InvoiceUploadDialog';

interface JobProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  currentProgress?: number;
  onProgressUpdate?: () => void;
}

export const JobProgressDialog = ({
  open,
  onOpenChange,
  requestId,
  currentProgress = 0,
  onProgressUpdate,
}: JobProgressDialogProps) => {
  const [progress, setProgress] = useState<number>(currentProgress);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const { updateJobProgress } = useContractorContext();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if photos are required for 100% completion
    if (progress === 100 && (!selectedFiles || selectedFiles.length === 0)) {
      toast.error('Photos are required to complete this job');
      return;
    }
    
    // If progress is 100%, show invoice upload dialog after uploading photos
    if (progress === 100) {
      // First upload the completion photos
      setUploading(true);
      try {
        let completionPhotos: Array<{ url: string }> = [];
        
        if (selectedFiles && selectedFiles.length > 0) {
          const uploads = Array.from(selectedFiles).map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `maintenance-uploads/${requestId}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('maintenance-files')
              .upload(filePath, file);
              
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage
              .from('maintenance-files')
              .getPublicUrl(filePath);
              
            return { url: data.publicUrl };
          });
          
          completionPhotos = await Promise.all(uploads);
        }
        
        // Update progress with completion photos
        await updateJobProgress(requestId, progress, notes, completionPhotos);
        
        toast.success('Job marked as completed with photos');
        setShowInvoiceDialog(true);
      } catch (error) {
        console.error('Error uploading completion photos:', error);
        toast.error('Failed to upload completion photos');
      } finally {
        setUploading(false);
      }
      return;
    }
    
    setUploading(true);
    try {
      let completionPhotos: Array<{ url: string }> = [];
      
      // Handle file uploads if any
      if (selectedFiles && selectedFiles.length > 0) {
        const uploads = Array.from(selectedFiles).map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `maintenance-uploads/${requestId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('maintenance-files')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data } = supabase.storage
            .from('maintenance-files')
            .getPublicUrl(filePath);
            
          return { url: data.publicUrl };
        });
        
        completionPhotos = await Promise.all(uploads);
      }
      
      // Update progress - now passing correctly according to updated type definition
      await updateJobProgress(requestId, progress, notes, completionPhotos);
      
      toast.success('Progress updated successfully');
      onOpenChange(false);
      
      // Trigger refresh in parent component
      if (onProgressUpdate) {
        setTimeout(() => {
          onProgressUpdate();
        }, 500);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setUploading(false);
    }
  };

  const handleInvoiceUploaded = () => {
    // Close both dialogs and refresh data
    setShowInvoiceDialog(false);
    onOpenChange(false);
    
    // Trigger refresh in parent component
    if (onProgressUpdate) {
      setTimeout(() => {
        onProgressUpdate();
      }, 500);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Job Progress</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progress">Completion Percentage: {progress}%</Label>
              <Slider
                id="progress"
                defaultValue={[progress]}
                max={100}
                step={5}
                onValueChange={(values) => setProgress(values[0])}
                className="my-4"
              />
              {progress === 100 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Job Completion Required</p>
                  </div>
                  <p className="text-sm text-green-700">
                    To mark this job as 100% complete, you'll need to upload an invoice with the final cost including GST.
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Progress Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe the progress you've made on this job..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="photos">
                Upload Photos {progress === 100 ? '(Required for Completion)' : '(Optional)'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  className="flex-1"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                />
                <Upload className="h-4 w-4 text-gray-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress === 100 
                  ? 'Photos showing the completed work are required before finishing this job'
                  : 'Upload photos showing your work progress'
                }
              </p>
              {progress === 100 && (!selectedFiles || selectedFiles.length === 0) && (
                <p className="text-xs text-destructive">
                  At least one photo is required to complete this job
                </p>
              )}
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={uploading}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={uploading}
              >
                {progress === 100 ? (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Invoice & Complete
                  </>
                ) : (
                  uploading ? 'Updating...' : 'Update Progress'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InvoiceUploadDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        requestId={requestId}
        onInvoiceUploaded={handleInvoiceUploaded}
      />
    </>
  );
};
