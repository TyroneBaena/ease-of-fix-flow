
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Tag, 
  MessageCircle,
  Paperclip,
  CheckCircle,
  XCircle,
  Send,
  User,
  ArrowLeft
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

// Sample data
import { requests } from '@/data/sampleData';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
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
  ]);
  
  // Find the request with the matching ID
  const request = requests.find(req => req.id === id);
  
  if (!request) {
    return <div>Request not found</div>;
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleAddComment = () => {
    if (!comment.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      user: 'You',
      role: 'Facility Manager',
      avatar: '/placeholder.svg',
      text: comment,
      timestamp: 'Just now'
    };
    
    setComments([...comments, newComment]);
    setComment('');
    toast.success('Comment added');
  };

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
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <div className="flex items-center mb-2">
                    <Badge className={`${getStatusColor(request.status)} mr-3`}>
                      {request.status === 'open' ? 'Open' : 
                       request.status === 'in-progress' ? 'In Progress' : 
                       'Completed'}
                    </Badge>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Submitted {request.createdAt}
                    </p>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Badge variant="outline" className="text-blue-600">
                    #{request.id.slice(0, 8)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-medium">{request.category}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{request.location}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="font-medium">{request.dueDate || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="font-medium">{request.assignedTo || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h2 className="font-semibold mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{request.description}</p>
              </div>
              
              {request.attachments && request.attachments.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-semibold mb-3 flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attachments ({request.attachments.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {request.attachments.map((attachment, index) => (
                      <div key={index} className="rounded-lg overflow-hidden border bg-gray-50">
                        <img 
                          src={attachment.url} 
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-full object-contain aspect-square"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            
            {/* Comments Section */}
            <Card className="p-6">
              <h2 className="font-semibold mb-6 flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Comments & Activity
              </h2>
              
              <div className="space-y-6">
                {comments.map(item => (
                  <div key={item.id} className="flex">
                    <Avatar className="h-8 w-8 mr-4">
                      <AvatarImage src={item.avatar} alt={item.user} />
                      <AvatarFallback>{item.user.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline">
                        <h3 className="font-medium">{item.user}</h3>
                        <span className="ml-2 text-xs text-gray-500">{item.role}</span>
                        <span className="ml-auto text-xs text-gray-500">{item.timestamp}</span>
                      </div>
                      <p className="text-gray-700 mt-1">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Label htmlFor="comment">Add a comment</Label>
                <div className="mt-2 flex">
                  <Textarea
                    id="comment"
                    placeholder="Type your comment here..."
                    className="min-h-[100px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button 
                    onClick={handleAddComment}
                    className="bg-blue-500 hover:bg-blue-600"
                    disabled={!comment.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Actions</h2>
              
              <div className="space-y-3">
                <Button className="w-full justify-start bg-blue-500 hover:bg-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {request.status === 'completed' ? 'Reopen Request' : 'Mark as Complete'}
                </Button>
                
                {request.status !== 'completed' && (
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Assign Technician
                  </Button>
                )}
                
                <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </div>
            </Card>
            
            <Card className="p-6">
              <h2 className="font-semibold mb-4">History</h2>
              <div className="space-y-4">
                {request.history?.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                    <div>
                      <p className="text-sm">{event.action}</p>
                      <p className="text-xs text-gray-500">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const Label = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
    {children}
  </label>
);

export default RequestDetail;
