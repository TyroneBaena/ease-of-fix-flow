
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 mb-6">
          The URL <span className="font-mono text-sm bg-gray-100 p-1 rounded">{location.pathname}</span> cannot be found.
        </p>
        <p className="text-gray-500 mb-4">
          This could be due to:
          <ul className="list-disc list-inside text-left mt-2 mb-6">
            <li>A typo in the URL</li>
            <li>The page being moved or deleted</li>
            <li>An incorrect link in the invitation email</li>
          </ul>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-blue-500 hover:bg-blue-600">
            <Link to="/"><Home className="w-4 h-4 mr-2" />Return to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login"><ArrowLeft className="w-4 h-4 mr-2" />Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
