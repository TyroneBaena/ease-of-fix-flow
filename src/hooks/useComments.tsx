
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';

export type Comment = {
  id: string;
  user: string;
  role: string;
  avatar: string;
  text: string;
  timestamp: string;
};

export type DatabaseComment = {
  id: string;
  user_id: string;
  request_id: string;
  text: string;
  user_name: string;
  user_role: string;
  created_at: string;
};

export function useComments(requestId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useUserContext();

  // Function to format database comments to our Comment type
  const formatComments = useCallback((dbComments: DatabaseComment[]): Comment[] => {
    return dbComments.map(comment => ({
      id: comment.id,
      user: comment.user_name,
      role: comment.user_role,
      avatar: '', // Default avatar
      text: comment.text,
      timestamp: formatTimestamp(comment.created_at)
    }));
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const commentDate = new Date(timestamp);
    const now = new Date();
    
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return commentDate.toLocaleDateString();
    }
  };

  // Fetch comments for the request
  const fetchComments = useCallback(async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to fetch comments');
        setComments([]);
      } else {
        console.log('Fetched comments:', data);
        setComments(formatComments(data as DatabaseComment[]));
      }
    } catch (error) {
      console.error('Unexpected error fetching comments:', error);
      toast.error('An error occurred while fetching comments');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, formatComments]);

  // Helper function to extract the actual user ID string
  const extractUserId = useCallback(async (): Promise<string | null> => {
    try {
      // First, try to get the user ID directly from Supabase auth
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting auth user:', error);
        return null;
      }
      
      if (user?.id) {
        console.log('Using auth user ID:', user.id);
        return user.id;
      }
      
      console.error('No authenticated user found');
      return null;
    } catch (error) {
      console.error('Error extracting user ID:', error);
      return null;
    }
  }, []);

  // Add a new comment
  const addComment = useCallback(async (text: string) => {
    if (!requestId || !currentUser) {
      toast.error('You must be logged in to add comments');
      return false;
    }
    
    // Get the actual user ID from Supabase auth
    const userId = await extractUserId();
    if (!userId) {
      toast.error('Authentication error. Please log in again.');
      return false;
    }
    
    try {
      console.log('Adding comment for user ID:', userId);
      console.log('Current user context:', currentUser);
      
      const newComment = {
        user_id: userId,
        request_id: requestId,
        text: text.trim(),
        user_name: currentUser.name || currentUser.email || 'Anonymous',
        user_role: currentUser.role || 'User'
      };
      
      console.log('Comment data being inserted:', newComment);
      
      const { data, error } = await supabase
        .from('comments')
        .insert(newComment)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding comment:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Failed to add comment: ${error.message}`);
        return false;
      }
      
      console.log('Comment added successfully:', data);
      
      // Optimistically update the UI
      const formattedComment: Comment = {
        id: data.id,
        user: data.user_name,
        role: data.user_role,
        avatar: '',
        text: data.text,
        timestamp: 'Just now'
      };
      
      setComments(prev => [formattedComment, ...prev]);
      toast.success('Comment added');
      return true;
    } catch (error) {
      console.error('Unexpected error adding comment:', error);
      toast.error('An error occurred while adding your comment');
      return false;
    }
  }, [requestId, currentUser, extractUserId]);

  // Fetch comments on mount and when requestId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    refreshComments: fetchComments
  };
}
