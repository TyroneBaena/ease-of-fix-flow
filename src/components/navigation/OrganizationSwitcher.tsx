import React from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
import { cn } from '@/lib/utils';

export const OrganizationSwitcher = () => {
  const {
    currentOrganization,
    userOrganizations,
    switchOrganization,
    loading
  } = useMultiOrganizationContext();

  const [open, setOpen] = React.useState(false);

  const handleSelect = async (organizationId: string) => {
    if (organizationId !== currentOrganization?.id) {
      await switchOrganization(organizationId);
    }
    setOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  // If no organization at all, don't show anything
  if (!currentOrganization) {
    return null;
  }

  // If user only has one organization, just show the name
  if (userOrganizations.length <= 1) {
    return (
      <div className="flex items-center space-x-2 text-sm font-medium">
        <Building2 className="h-4 w-4" />
        <span>{currentOrganization.name}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentOrganization.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandGroup>
              {userOrganizations.map((userOrg) => (
                <CommandItem
                  key={userOrg.organization_id}
                  value={userOrg.organization.name}
                  onSelect={() => handleSelect(userOrg.organization_id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentOrganization.id === userOrg.organization_id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{userOrg.organization.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {userOrg.role}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};