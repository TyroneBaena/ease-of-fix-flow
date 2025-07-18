
import React, { useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormItem } from "@/components/ui/form";
import { X, Upload, Loader2 } from 'lucide-react';

interface RequestFormAttachmentsProps {
  files: File[];
  previewUrls: string[];
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  isUploading?: boolean;
  showError?: boolean;
}

export const RequestFormAttachments = ({
  files,
  previewUrls,
  onFileChange,
  onRemoveFile,
  isUploading = false,
  showError = false
}: RequestFormAttachmentsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              <Label className="text-base font-semibold">
                Photo(s) of the concern/issue/damage and Filled-out Hazard Report Form (if applicable) *
              </Label>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              At least 1 photo is required. Up to 10 images allowed.
            </p>
            
            {showError && files.length === 0 && (
              <p className="text-red-500 text-sm">
                Please upload at least one photo before submitting the request.
              </p>
            )}
            
            <div className="flex items-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleButtonClick}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? 'Processing...' : 'Select Files'}
              </Button>
              <span className="ml-4 text-sm text-gray-500">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
                {isUploading && ' (uploading...)'}
              </span>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/*"
                multiple
                disabled={isUploading}
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
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
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
