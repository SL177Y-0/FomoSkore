import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

function Navigation({ showVeridaLink = true }) {
  const location = useLocation();
  
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold">FomoScore</Link>
          
          {/* Main navigation links */}
          <div className="hidden md:flex space-x-4">
            <Link 
              to="/" 
              className={`hover:text-blue-300 transition-colors ${location.pathname === '/' ? 'text-blue-400' : ''}`}
            >
              
            </Link>
            {/* Add more main navigation links as needed */}
          </div>
        </div>
        

      </div>
    </nav>
  );
}

Navigation.propTypes = {
  showVeridaLink: PropTypes.bool
};

export default Navigation; 