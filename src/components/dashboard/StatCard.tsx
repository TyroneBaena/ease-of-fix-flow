
import React from 'react';
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description?: string;
  tooltipText?: string;
}

// Custom comparison function for StatCard
const arePropsEqual = (prevProps: StatCardProps, nextProps: StatCardProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.color === nextProps.color &&
    prevProps.description === nextProps.description &&
    prevProps.tooltipText === nextProps.tooltipText
    // Note: icon comparison is intentionally omitted as React nodes are complex to compare
  );
};

const StatCard = ({ title, value, icon, color, description, tooltipText }: StatCardProps) => {
  // Debug logging to track renders
  console.log(`📊 StatCard "${title}" re-rendered with value: ${value}`);
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium text-gray-500 cursor-help">{title}</p>
              </TooltipTrigger>
              {tooltipText && (
                <TooltipContent>
                  <p>{tooltipText}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default React.memo(StatCard, arePropsEqual);
