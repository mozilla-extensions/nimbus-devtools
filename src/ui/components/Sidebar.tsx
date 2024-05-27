import { FC } from "react";
import { Link } from "react-router-dom";

const Sidebar: FC = () => {
  return (
    <div className="sidebar">
      <Link to="/experiment-json" className="sidebar__link">
        JSON Enrollment
      </Link>
      <Link to="/experiment-feature-config" className="sidebar__link">
        Feature Configuration Enrollment
      </Link>
      <Link to="/settings" className="sidebar__link">
        Settings
      </Link>
    </div>
  );
};

export default Sidebar;
