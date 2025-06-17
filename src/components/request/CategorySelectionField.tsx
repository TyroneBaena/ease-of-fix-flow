
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategorySelectionFieldProps {
  category: string;
  priority: string;
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
}

export const CategorySelectionField: React.FC<CategorySelectionFieldProps> = ({
  category,
  priority,
  onCategoryChange,
  onPriorityChange
}) => {
  const categories = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'structural', label: 'Structural' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'landscaping', label: 'Landscaping' },
    { value: 'security', label: 'Security' },
    { value: 'technology', label: 'Technology/IT' },
    { value: 'furniture', label: 'Furniture/Equipment' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', description: 'Can be scheduled within 1-2 weeks' },
    { value: 'medium', label: 'Medium', description: 'Should be addressed within a few days' },
    { value: 'high', label: 'High', description: 'Needs attention within 24 hours' },
    { value: 'critical', label: 'Critical', description: 'Urgent - requires immediate attention' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category*</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority/Urgency*</Label>
        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority level" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((prio) => (
              <SelectItem key={prio.value} value={prio.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{prio.label}</span>
                  <span className="text-xs text-gray-500">{prio.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
