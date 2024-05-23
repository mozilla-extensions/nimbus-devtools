import { FC } from "react";
import { Link } from "react-router-dom";

import logo from "../static/logo.png";

const Navbar: FC = () => {
  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav__content">
          <img alt="logo" className="nav__logo" src={logo} />
          <Link to="/experiment-json" className="nav__link">
            Nimbus Developer Tools
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
