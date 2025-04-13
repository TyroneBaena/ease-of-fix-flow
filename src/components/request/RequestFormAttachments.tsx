
import React from 'react';
import { Label } from "@/components/ui/label";
import { ImagePlus, X } from 'lucide-react';

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
  return (
    <div>
      <Label className="text-base">Attachments (Optional)</Label>
      <p className="text-sm text-gray-500 mb-3">
        Upload photos or documents related to the issue
      </p>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={onFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
        <label 
          htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Choose Files
        </label>
        <p className="mt-2 text-xs text-gray-500">
          PNG, JPG, PDF up to 10MB each
        </p>
      </div>
      
      {previewUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative">
              <div className="aspect-square rounded-lg overflow-hidden border bg-gray-50">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
