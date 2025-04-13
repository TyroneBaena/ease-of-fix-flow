
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Home, 
  ClipboardList, 
  Search, 
  Filter, 
  Plus, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import RequestCard from '@/components/RequestCard';
import StatusChart from '@/components/StatusChart';
import CategoryChart from '@/components/CategoryChart';

// Sample data
import { requests } from '@/data/sampleData';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRequests, setFilteredRequests] = useState(requests);
  const [activeFilter, setActiveFilter] = useState('all');

  // Filter requests based on search term and active filter
  React.useEffect(() => {
    let result = requests;
    
    if (searchTerm) {
      result = result.filter(request => 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        request.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(request => request.status === activeFilter);
    }
    
    setFilteredRequests(result);
  }, [searchTerm, activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Count requests by status
  const openRequests = requests.filter(req => req.status === 'open').length;
  const inProgressRequests = requests.filter(req => req.status === 'in-progress').length;
  const completedRequests = requests.filter(req => req.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Maintenance Dashboard</h1>
          <Button 
            onClick={() => navigate('/new-request')} 
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Open Requests" 
            value={openRequests} 
            icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
            color="bg-amber-50"
          />
          <StatCard 
            title="In Progress" 
            value={inProgressRequests} 
            icon={<Wrench className="h-8 w-8 text-blue-500" />}
            color="bg-blue-50"
          />
          <StatCard 
            title="Completed" 
            value={completedRequests} 
            icon={<CheckCircle className="h-8 w-8 text-green-500" />}
            color="bg-green-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">Recent Requests</h2>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute top-3 left-3 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search requests..."
                      className="pl-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-6 overflow-x-auto">
                <Badge 
                  onClick={() => handleFilterChange('all')} 
                  className={`cursor-pointer ${activeFilter === 'all' ? 'bg-gray-900' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  All
                </Badge>
                <Badge 
                  onClick={() => handleFilterChange('open')} 
                  className={`cursor-pointer ${activeFilter === 'open' ? 'bg-amber-500' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`}
                >
                  Open
                </Badge>
                <Badge 
                  onClick={() => handleFilterChange('in-progress')} 
                  className={`cursor-pointer ${activeFilter === 'in-progress' ? 'bg-blue-500' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
                >
                  In Progress
                </Badge>
                <Badge 
                  onClick={() => handleFilterChange('completed')} 
                  className={`cursor-pointer ${activeFilter === 'completed' ? 'bg-green-500' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                >
                  Completed
                </Badge>
              </div>
              
              <div className="space-y-4">
                {filteredRequests.length > 0 ? (
                  filteredRequests.slice(0, 5).map(request => (
                    <RequestCard key={request.id} request={request} onClick={() => navigate(`/requests/${request.id}`)} />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No matching requests found</p>
                  </div>
                )}
              </div>
              
              {filteredRequests.length > 5 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => navigate('/requests')}>
                    View All Requests
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Analytics
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Request Status</h3>
                  <div className="h-64">
                    <StatusChart />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Request Categories</h3>
                  <div className="h-64">
                    <CategoryChart />
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                Upcoming Maintenance
              </h2>
              <div className="space-y-2">
                <div className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium">HVAC Inspection</h3>
                    <Badge variant="outline" className="text-xs">Today</Badge>
                  </div>
                  <p className="text-sm text-gray-500">Main Building, Floor 3</p>
                </div>
                <div className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium">Elevator Service</h3>
                    <Badge variant="outline" className="text-xs">Tomorrow</Badge>
                  </div>
                  <p className="text-sm text-gray-500">North Tower</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full mt-4 text-blue-500">
                View Schedule
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default Dashboard;
