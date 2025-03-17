import { FC } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();

  return (
    <Nav className="sidebar d-block rounded position-fixed m-2 light-bg">
      {links.map((link, index) => {
        const linkIsActive =
          location.pathname === link.to ||
          (location.pathname === "/" && link.to === "/experiment-json");

        return (
          <Nav.Link
            key={index}
            as={Link}
            to={link.to}
            className={`sidebar__link p-4 secondary-fg ${linkIsActive ? "active" : ""}`}
          >
            {link.text}
          </Nav.Link>
        );
      })}
    </Nav>
  );
};

export default Sidebar;
