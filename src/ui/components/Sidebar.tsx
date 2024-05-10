import { Link } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <Link to="/experiment-json" className="sidebar__link">JSON Enrollment</Link>
    </div>
  );
};

export default Sidebar;
