
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MaintenanceRequest } from '@/types/maintenance';
import { Check, Edit, User } from 'lucide-react';
import { JobProgressDialog } from './JobProgressDialog';

interface JobProgressCardProps {
  request: MaintenanceRequest;
  isContractor: boolean;
}

export const JobProgressCard = ({ request, isContractor }: JobProgressCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const progress = request.completionPercentage || 0;
  
  const renderProgressNotes = () => {
    if (!request.progressNotes || request.progressNotes.length === 0) {
      return <p className="text-sm text-muted-foreground">No progress notes yet</p>;
    }
    
    return (
      <div className="space-y-2">
        {request.progressNotes.map((note, index) => {
          // Handle when note is a string
          if (typeof note === 'string') {
            return (
              <div key={index} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm">{note}</p>
              </div>
            );
          }
          
          // Handle when note is an object with note and timestamp properties
          if (typeof note === 'object' && note !== null) {
            // Extract note content and timestamp if they exist
            const noteContent = note.note || JSON.stringify(note);
            const timestamp = note.timestamp 
              ? new Date(note.timestamp).toLocaleString()
              : null;
            
            return (
              <div key={index} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm">{noteContent}</p>
                {timestamp && (
                  <p className="text-xs text-muted-foreground">{timestamp}</p>
                )}
              </div>
            );
          }
          
          // Fallback for any other type
          return (
            <div key={index} className="border-l-2 border-gray-200 pl-3">
              <p className="text-sm text-muted-foreground">Unknown note format</p>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div>Job Progress</div>
            {progress === 100 && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Complete
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.assignedTo && (
            <div className="flex items-center gap-2 text-sm mb-2 border-b pb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Assigned to:</span> 
              <span>{request.assignedTo}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>{progress}% Complete</span>
              {progress === 100 ? <span>Finished</span> : <span>In Progress</span>}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Progress Notes</h4>
            {renderProgressNotes()}
          </div>
          
          {isContractor && request.status !== 'completed' && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Update Progress
            </Button>
          )}
        </CardContent>
      </Card>
      
      <JobProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        requestId={request.id}
        currentProgress={progress}
      />
    </>
  );
};
