
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { BudgetCategory } from '@/types/budget';
import { useSearchParams } from 'react-router-dom';
import { usePublicPropertyContext } from '@/contexts/property/PublicPropertyProvider';
import { usePropertyContext } from '@/contexts/property/PropertyContext';

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
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get('public') === 'true';

  // Use appropriate context based on public/private access
  let budgetCategories: BudgetCategory[] = [];
  
  if (isPublic) {
    try {
      const { budgetCategories: publicBudgetCategories } = usePublicPropertyContext();
      budgetCategories = publicBudgetCategories;
      console.log('🔍 [DEBUG] CategorySelection - Using public budget categories:', budgetCategories.length);
      console.log('🔍 [DEBUG] CategorySelection - Public budget categories data:', publicBudgetCategories);
    } catch (error) {
      console.log('⚠️ [DEBUG] CategorySelection - Public context not available:', error);
      budgetCategories = [];
    }
  } else {
    // For authenticated users, we'll need to fetch budget categories directly
    // since the PropertyContext doesn't include them
    const [privateBudgetCategories, setPrivateBudgetCategories] = React.useState<BudgetCategory[]>([]);
    
    React.useEffect(() => {
      if (!isPublic) {
        console.log('🔍 [DEBUG] CategorySelection - Fetching private budget categories');
        const fetchBudgetCategories = async () => {
          try {
            const { data, error } = await supabase
              .from('budget_categories')
              .select('*')
              .order('name');

            if (error) {
              console.error('❌ [DEBUG] CategorySelection - Error fetching budget categories:', error);
            } else {
              console.log('✅ [DEBUG] CategorySelection - Private budget categories loaded:', data?.length || 0);
              setPrivateBudgetCategories(data || []);
            }
          } catch (err) {
            console.error('❌ [DEBUG] CategorySelection - Error fetching budget categories:', err);
          }
        };
        
        fetchBudgetCategories();
      }
    }, [isPublic]);
    
    budgetCategories = privateBudgetCategories;
    console.log('🔍 [DEBUG] CategorySelection - Using private budget categories:', budgetCategories.length);
  }

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
