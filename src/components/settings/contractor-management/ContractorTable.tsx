
import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Key, Loader2 } from "lucide-react";
import ContractorTablePagination from './table/ContractorTablePagination';
import { Contractor } from '@/types/contractor';
import { Badge } from '@/components/ui/badge';

interface ContractorTableProps {
  contractors: Contractor[];
  isLoading: boolean;
  onEditContractor: (contractor: Contractor) => void;
  onDeleteContractor: (contractor: Contractor) => void;
  onResetPassword: (contractorId: string, email: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  contractorsPerPage: number;
}

const ContractorTable = ({
  contractors,
  isLoading,
  onEditContractor,
  onDeleteContractor,
  onResetPassword,
  currentPage,
  totalPages,
  onPageChange,
  contractorsPerPage
}: ContractorTableProps) => {

  if (contractors.length === 0) {
    return (
      <div className="bg-white rounded-md border p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No Contractors Yet</h3>
        <p className="text-muted-foreground mb-4">
          Invite contractors to get started with maintenance work on your properties.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border overflow-hidden">
      <Table>
        <TableCaption>
          <ContractorTablePagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Specialties</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contractors.map((contractor) => (
            <TableRow key={contractor.id}>
              <TableCell className="font-medium">{contractor.companyName}</TableCell>
              <TableCell>{contractor.contactName}</TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span>{contractor.email}</span>
                  <span className="text-muted-foreground">{contractor.phone}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {contractor.specialties?.map((specialty, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                  {!contractor.specialties?.length && (
                    <span className="text-muted-foreground text-xs">No specialties listed</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onResetPassword(contractor.id, contractor.email)}
                    disabled={isLoading}
                    title="Reset Password"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEditContractor(contractor)}
                    disabled={isLoading}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onDeleteContractor(contractor)}
                    disabled={isLoading}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <div className="flex justify-center items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading contractors...</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContractorTable;
