
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
}

export const CategorySelectionField: React.FC<CategorySelectionFieldProps> = ({
  category,
  priority,
  onCategoryChange,
  onPriorityChange
}) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBudgetCategories();
  }, []);

  const fetchBudgetCategories = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching budget categories...');
      
      // Fetch budget categories for the current organization
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .order('name');

      console.log('Budget categories response:', { data, error });

      if (error) {
        console.error('Error fetching budget categories:', error);
        setBudgetCategories([]);
      } else {
        console.log('Setting budget categories:', data);
        setBudgetCategories(data || []);
      }
    } catch (err) {
      console.error('Error fetching budget categories:', err);
      setBudgetCategories([]);
    } finally {
      setIsLoading(false);
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
            {isLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading categories...</div>
            ) : budgetCategories.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No categories available</div>
            ) : (
              budgetCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))
            )}
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
