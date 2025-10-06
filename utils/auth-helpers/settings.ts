// Boolean toggles to determine which auth types are allowed
const allowOauth = true;
const allowEmail = true;
const allowPassword = true;

// Boolean toggle to determine whether auth interface should route through server or client
// (Currently set to false because screen sometimes flickers with server redirects)
const allowServerRedirect = false;

// Organisation feature toggles
const allowOrganisations = true;
const allowUserCreateOrganisations = true;
const allowOrganisationInvites = true;
const allowOrganisationRoleManagement = true;
const requireOrganisationForSignup = true;

// Check that at least one of allowPassword and allowEmail is true
if (!allowPassword && !allowEmail)
  throw new Error('At least one of allowPassword and allowEmail must be true');

export const getAuthTypes = () => {
  return { allowOauth, allowEmail, allowPassword };
};

export const getOrganisationSettings = () => {
  return {
    allowOrganisations,
    allowUserCreateOrganisations,
    allowOrganisationInvites,
    allowOrganisationRoleManagement,
    requireOrganisationForSignup
  };
};

export const getViewTypes = () => {
  // Define the valid view types
  let viewTypes: string[] = [];
  if (allowEmail) {
    viewTypes = [...viewTypes, 'email_signin'];
  }
  if (allowPassword) {
    viewTypes = [
      ...viewTypes,
      'password_signin',
      'forgot_password',
      'update_password',
      'signup'
    ];
  }
  
  // Add organisation-specific view types
  if (allowOrganisations) {
    viewTypes = [
      ...viewTypes,
      'organisation_signup',
      'organisation_invite_signin'
    ];
  }

  return viewTypes;
};

export const getDefaultSignInView = (preferredSignInView: string | null) => {
  // Define the default sign in view
  let defaultView = allowPassword ? 'password_signin' : 'email_signin';
  if (preferredSignInView && getViewTypes().includes(preferredSignInView)) {
    defaultView = preferredSignInView;
  }

  return defaultView;
};

export const getRedirectMethod = () => {
  return allowServerRedirect ? 'server' : 'client';
};
