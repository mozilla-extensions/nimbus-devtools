import { FC } from "react";
import { Link } from "react-router-dom";
import { Navbar, Container } from "react-bootstrap";

import logo from "../static/logo.png";

const NavigationBar: FC = () => {
  return (
    <Navbar className="p-2">
      <Container className="d-flex justify-content-start align-items-center ms-3 py-1">
        <img alt="logo" src={logo} width="32" className="me-2" />
        <Link
          to="/experiment-json"
          className="ms-2 text-white text-decoration-none fs-3"
        >
          <strong>Nimbus Developer Tools</strong>
        </Link>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
