import { FC } from "react";
import { NavLink } from "react-router-dom";
import { Nav } from "react-bootstrap";

const links = [
  { to: "/experiment-json", text: "Recipe Enrollment" },
  {
    to: "/experiment-feature-config",
    text: "Feature Configuration Enrollment",
  },
  { to: "/jexl-debugger", text: "JEXL Debugger" },
  { to: "/experiment-store", text: "Experiment Store" },
  { to: "/experiment-browser", text: "Experiment Browser" },
  { to: "/settings", text: "Settings" },
];

const Sidebar: FC = () => {
  return (
    <Nav className="sidebar d-block rounded position-fixed m-2 light-bg">
      {links.map((link, index) => (
        <NavLink
          key={index}
          to={link.to}
          className={({ isActive }) =>
            `sidebar__link p-4 d-block secondary-fg text-decoration-none ${isActive ? "active" : ""}`
          }
        >
          {link.text}
        </NavLink>
      ))}
    </Nav>
  );
};

export default Sidebar;
