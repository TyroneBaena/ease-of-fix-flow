
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send } from 'lucide-react';
import { toast } from "@/lib/toast";

type Comment = {
  id: string;
  user: string;
  role: string;
  avatar: string;
  text: string;
  timestamp: string;
};

interface CommentSectionProps {
  initialComments: Comment[];
}

export const CommentSection = ({ initialComments }: CommentSectionProps) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  
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
  );
};

const Label = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
    {children}
  </label>
);
