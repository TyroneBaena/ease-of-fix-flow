
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MaintenanceRequest } from '@/types/maintenance';
import { User, DollarSign, UserCog, FileText, CheckCircle } from 'lucide-react';

interface JobProgressSectionProps {
  request: MaintenanceRequest;
  onOpenContractorDialog?: () => void;
  onOpenQuotesDialog?: () => void;
  onOpenActionsDialog?: () => void;
}

export const JobProgressSection = ({ 
  request, 
  onOpenContractorDialog,
  onOpenQuotesDialog,
  onOpenActionsDialog
}: JobProgressSectionProps) => {
  const progress = request.completionPercentage || 0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderProgressNotes = () => {
    if (!request.progressNotes || request.progressNotes.length === 0) {
      return <p className="text-sm text-muted-foreground">No progress notes yet</p>;
    }
    
    return (
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {request.progressNotes.slice(0, 3).map((note, index) => {
          let noteText = '';
          
          if (typeof note === 'string') {
            try {
              const parsedNote = JSON.parse(note);
              noteText = parsedNote.note || note;
            } catch {
              noteText = note;
            }
          } else if (typeof note === 'object' && note !== null) {
            noteText = note.note || JSON.stringify(note);
          }
          
          return (
            <div key={index} className="border-l-2 border-gray-200 pl-3 py-1">
              <p className="text-sm">{noteText}</p>
            </div>
          );
        })}
        {request.progressNotes.length > 3 && (
          <p className="text-xs text-muted-foreground">+{request.progressNotes.length - 3} more notes</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Job Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Job Progress
            </div>
            {getStatusBadge(request.status)}
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
            <h4 className="text-sm font-medium mb-2">Latest Updates</h4>
            {renderProgressNotes()}
          </div>
        </CardContent>
      </Card>

      {/* 2. Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.status !== 'completed' && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={onOpenActionsDialog}
              >
                <FileText className="h-4 w-4 mr-2" />
                Manage Request
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.open(`/request/${request.id}`, '_blank')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Change Contractor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Contractor Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.contractorId ? (
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">Currently assigned to:</p>
                <p className="font-medium">{request.assignedTo || 'Assigned Contractor'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No contractor assigned yet</p>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={onOpenContractorDialog}
            >
              <UserCog className="h-4 w-4 mr-2" />
              {request.contractorId ? 'Change Contractor' : 'Assign Contractor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Submitted Quotes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.quotedAmount ? (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Approved Quote:</p>
                <p className="font-semibold text-lg text-green-600">
                  ${request.quotedAmount.toLocaleString()}
                </p>
              </div>
            ) : request.quotes && request.quotes.length > 0 ? (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Pending quotes:</p>
                <p className="font-medium">{request.quotes.length} quote(s) submitted</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quotes submitted yet</p>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={onOpenQuotesDialog}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              View All Quotes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
