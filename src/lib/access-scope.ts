import { alphaApi } from "./api";
import { getSession, setEmployerSelection, setOrganizationSelection } from "./session";
import type { ScopeEmployer, ScopeOrganization } from "./types";

export type SingleEmployerScope = {
  organization: ScopeOrganization;
  employer: ScopeEmployer;
};

export async function resolveSingleEmployerScope(): Promise<SingleEmployerScope | null> {
  const session = getSession();
  if (!session || session.platformAdmin) return null;

  const scope = await alphaApi.scope();
  const employers = scope.organizations.flatMap((organization) =>
    organization.employers.map((employer) => ({ organization, employer }))
  );

  if (employers.length !== 1) return null;

  const only = employers[0];
  setOrganizationSelection(only.organization.id);
  setEmployerSelection(only.organization.id, only.employer.id);
  return only;
}
