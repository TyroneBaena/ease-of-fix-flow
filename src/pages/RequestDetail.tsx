
import React from 'react';
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { RequestInfo } from '@/components/request/RequestInfo';
import { CommentSection } from '@/components/request/CommentSection';
import { RequestActions } from '@/components/request/RequestActions';
import { RequestHistory } from '@/components/request/RequestHistory';
import { MaintenanceRequest } from '@/types/property';

// Sample data
import { requests } from '@/data/sampleData';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the request with the matching ID and convert to MaintenanceRequest type
  const request = React.useMemo(() => {
    const foundRequest = requests.find(req => req.id === id);
    
    if (!foundRequest) return null;
    
    // Convert to complete MaintenanceRequest type
    return {
      ...foundRequest,
      isParticipantRelated: false, // Default values
      participantName: 'N/A',
      attemptedFix: '',
      issueNature: foundRequest.title || '',
      explanation: foundRequest.description || '',
      reportDate: foundRequest.createdAt.split('T')[0] || '',
      site: foundRequest.category || '',
      submittedBy: '',
    } as MaintenanceRequest;
  }, [id]);
  
  if (!request) {
    return <div>Request not found</div>;
  }
  
  // Initial comments data
  const initialComments = [
    {
      id: '1',
      user: 'John Doe',
      role: 'Maintenance Supervisor',
      avatar: '/placeholder.svg',
      text: 'I\'ve assigned this to our electrical team. They will visit tomorrow morning between 9-11 AM. Please ensure access to the location.',
      timestamp: '2 days ago'
    },
    {
      id: '2',
      user: 'Sarah Smith',
      role: 'Requester',
      avatar: '/placeholder.svg',
      text: 'Thank you. I\'ll make sure someone is available to provide access during that time.',
      timestamp: '1 day ago'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            <RequestInfo request={request} />
            <CommentSection initialComments={initialComments} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <RequestActions status={request.status} />
            <RequestHistory history={request.history} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestDetail;
