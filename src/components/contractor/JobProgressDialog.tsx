
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
import { Check, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
  const { updateJobProgress } = useContractorContext();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
            .from('maintenance')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data } = supabase.storage
            .from('maintenance')
            .getPublicUrl(filePath);
            
          return { url: data.publicUrl };
        });
        
        completionPhotos = await Promise.all(uploads);
      }
      
      // Update progress
      await updateJobProgress(requestId, progress, notes, completionPhotos);
      
      toast.success('Progress updated successfully');
      onOpenChange(false);
      if (onProgressUpdate) onProgressUpdate();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setUploading(false);
    }
  };
  
  return (
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
              <p className="text-sm text-green-500">
                <Check className="inline-block h-4 w-4 mr-1" />
                This will mark the job as complete
              </p>
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
            <Label htmlFor="photos">Upload Photos (Optional)</Label>
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
              Upload photos showing your work progress
            </p>
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
              {uploading ? 'Updating...' : 'Update Progress'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
