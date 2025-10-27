import { useState, useMemo } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';


export const useContractorJobFilters = (allJobs: MaintenanceRequest[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  


  // Get unique sites from all jobs
  const sites = useMemo(() => {
    const uniqueSites = Array.from(new Set(
      allJobs
        .map(job => job.site)
        .filter(Boolean)
        .map(site => site!)
    ));
    return uniqueSites.sort();
  }, [allJobs]);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...allJobs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower) ||
        job.site.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Site filter
    if (siteFilter !== 'all') {
      filtered = filtered.filter(job => job.site === siteFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(job => job.priority === priorityFilter);
    }


    // Sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || a.createdAt);
          bValue = new Date(b.updatedAt || b.createdAt);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = { 'pending': 1, 'open': 2, 'in-progress': 3, 'completed': 4, 'cancelled': 5 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    allJobs,
    searchTerm,
    statusFilter,
    siteFilter,
    priorityFilter,
    sortField,
    sortDirection,
  ]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    siteFilter,
    setSiteFilter,
    priorityFilter,
    setPriorityFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    sites,
    filteredJobs
  };
};