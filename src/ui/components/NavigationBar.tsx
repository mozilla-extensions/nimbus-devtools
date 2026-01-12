import { FC } from "react";
import { Link } from "react-router-dom";
import { Navbar, Container } from "react-bootstrap";

const logoUrl = String(new URL("../static/logo.png", import.meta.url));

const NavigationBar: FC = () => {
  return (
    <Navbar className="p-2">
      <Container className="d-flex justify-content-start align-items-center ms-3 py-1">
        <img alt="logo" src={logoUrl} width="32" className="me-2" />
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
