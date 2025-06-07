
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { ContractorProvider } from '@/contexts/contractor';
import { JobProgressDialog } from '@/components/contractor/JobProgressDialog';
import { useJobDetail } from '@/hooks/contractor/useJobDetail';
import { JobDetailSkeleton } from '@/components/contractor/job-detail/JobDetailSkeleton';
import { JobDetailError } from '@/components/contractor/job-detail/JobDetailError';
import { ContractorJobDetailHeader } from '@/components/contractor/job-detail/ContractorJobDetailHeader';
import { JobDetailsCard } from '@/components/contractor/job-detail/JobDetailsCard';
import { IssueDetailsCard } from '@/components/contractor/job-detail/IssueDetailsCard';
import { AttachmentsCard } from '@/components/contractor/job-detail/AttachmentsCard';
import { ProgressCard } from '@/components/contractor/job-detail/ProgressCard';
import { ContactCard } from '@/components/contractor/job-detail/ContactCard';
import { CommentSection } from '@/components/request/CommentSection';

const ContractorJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useJobDetail(id);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <JobDetailSkeleton />
      </div>
    );
  }
  
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <JobDetailError error={error} />
      </div>
    );
  }

  console.log('Job data in ContractorJobDetail:', {
    practiceLeader: job.practiceLeader,
    practiceLeaderEmail: job.practiceLeaderEmail,
    practiceLeaderPhone: job.practiceLeaderPhone,
    address: job.address
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <main className="container mx-auto px-4 py-8">
        <ContractorJobDetailHeader 
          job={job} 
          onUpdateProgress={() => setProgressDialogOpen(true)} 
        />
        
        {/* Enhanced layout with better spacing and organization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content - left side */}
          <div className="lg:col-span-2 space-y-8">
            <JobDetailsCard job={job} />
            <IssueDetailsCard job={job} />
            <AttachmentsCard attachments={job.attachments} />
            <CommentSection requestId={job.id} />
          </div>
          
          {/* Sidebar - right side */}
          <div className="space-y-8">
            <ProgressCard request={job} />
            <ContactCard 
              practiceLeader={job.practiceLeader || ''}
              practiceLeaderPhone={job.practiceLeaderPhone || ''}
              practiceLeaderEmail={job.practiceLeaderEmail || ''}
              address={job.address || ''}
            />
          </div>
        </div>
        
        <ContractorProvider>
          <JobProgressDialog
            open={progressDialogOpen}
            onOpenChange={setProgressDialogOpen}
            requestId={job.id}
            currentProgress={job.completionPercentage || 0}
            onProgressUpdate={() => {
              // Refresh job details after update
              window.location.reload();
            }}
          />
        </ContractorProvider>
      </main>
    </div>
  );
};

export default ContractorJobDetail;
