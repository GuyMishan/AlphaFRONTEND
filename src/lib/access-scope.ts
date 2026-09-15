import { alphaApi } from "./api";
import { getSession, setEmployerSelection, setOrganizationSelection } from "./session";
import type { Employer, Organization } from "./types";

export type SingleEmployerScope = {
  organization: Organization;
  employer: Employer;
};

export async function resolveSingleEmployerScope(): Promise<SingleEmployerScope | null> {
  const session = getSession();
  if (!session || session.platformAdmin) return null;

  const organizations = await alphaApi.organizations();
  if (organizations.length !== 1) return null;

  const organization = organizations[0];
  const [capabilities, employers] = await Promise.all([
    alphaApi.capabilities(organization.id),
    alphaApi.employers(organization.id),
  ]);

  if (capabilities.canCreateEmployer || employers.length !== 1) return null;

  const employer = employers[0];
  setOrganizationSelection(organization.id);
  setEmployerSelection(organization.id, employer.id);
  return { organization, employer };
}
