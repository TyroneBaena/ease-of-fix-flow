
import React, { useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormItem } from "@/components/ui/form";
import { X, Upload } from 'lucide-react';

interface RequestFormAttachmentsProps {
  files: File[];
  previewUrls: string[];
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

export const RequestFormAttachments = ({
  files,
  previewUrls,
  onFileChange,
  onRemoveFile
}: RequestFormAttachmentsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Photo(s) of the concern/issue/damage and Filled-out Hazard Report Form (if applicable)
            </Label>
            <p className="text-sm text-gray-500 mb-2">
              Up to 10 images allowed
            </p>
            
            <div className="flex items-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleButtonClick}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Select Files
              </Button>
              <span className="ml-4 text-sm text-gray-500">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </span>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/*"
                multiple
              />
            </div>
            
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative rounded-md overflow-hidden border">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => onRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
