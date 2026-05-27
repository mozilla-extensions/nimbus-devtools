import { FC } from "react";
import { Table, Button, Container } from "react-bootstrap";

import useEnrollments, { NimbusEnrollment } from "../hooks/useEnrollments";

const ExperimentStorePage: FC = () => {
  const { enrollments, unenroll, deleteEnrollment } = useEnrollments();

  return (
    <Container>
      <h1 className="my-3 fw-bold fs-3 primary-fg">Experiment Store</h1>
      <Table hover>
        <thead>
          <tr>
            <th className="text-center primary-fg light-bg">Experiment</th>
            <th className="text-center primary-fg light-bg">featureIds</th>
            <th className="text-center primary-fg light-bg">isRollout</th>
            <th className="text-center primary-fg light-bg">Status</th>
            <th className="text-center primary-fg light-bg">Options</th>
          </tr>
        </thead>
        <tbody>
          {enrollments?.map((experiment: NimbusEnrollment, index: number) => (
            <tr key={index}>
              <td className="align-middle ps-0 py-3">
                <strong>{experiment.slug}</strong> <br /> <br />
                {experiment.userFacingName}: {experiment.userFacingDescription}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.featureIds.join(", ")}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.isRollout ? "Yes" : "No"}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.active ? "Active" : "Inactive"}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.active ? (
                  <Button
                    onClick={() => unenroll(experiment.slug)}
                    className="option-button primary-fg px-2 py-1 rounded grey-border light-bg"
                  >
                    Unenroll
                  </Button>
                ) : (
                  <Button
                    onClick={() => deleteEnrollment(experiment.slug)}
                    className="option-button primary-fg px-2 py-1 rounded grey-border light-bg"
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default ExperimentStorePage;
