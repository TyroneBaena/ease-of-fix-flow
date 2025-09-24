
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { BudgetCategory } from '@/types/budget';

interface CategorySelectionFieldProps {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | '';
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: 'low' | 'medium' | 'high' | 'critical') => void;
  propertyId?: string; // For public access via QR code
}

export const CategorySelectionField: React.FC<CategorySelectionFieldProps> = ({
  category,
  priority,
  onCategoryChange,
  onPriorityChange,
  propertyId
}) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);

  useEffect(() => {
    fetchBudgetCategories();
  }, [propertyId]); // Add propertyId as dependency

  const fetchBudgetCategories = async () => {
    try {
      // For public access, use the edge function to get budget categories
      if (propertyId) {
        console.log('🔍 Fetching budget categories for public access');
        const response = await fetch(`https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-property-data?propertyId=${encodeURIComponent(propertyId)}`);
        const result = await response.json();
        
        if (response.ok && result.budgetCategories) {
          setBudgetCategories(result.budgetCategories);
          return;
        }
      }
      
      // Fallback to authenticated endpoint
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching budget categories:', error);
        setBudgetCategories([]);
      } else {
        setBudgetCategories(data || []);
      }
    } catch (err) {
      console.error('Error fetching budget categories:', err);
      setBudgetCategories([]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Budget Category *</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {budgetCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority *</Label>
        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
