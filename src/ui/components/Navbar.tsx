import * as React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav__content">
          <Link to="/experiment-json" className="nav__link">Nimbus Developer Tools</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
