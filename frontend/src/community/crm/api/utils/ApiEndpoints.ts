import { moduleAPIPath } from "~community/common/constants/configs";

export const crmEndpoints = {
  CREATE_CONTACT: `${moduleAPIPath.CRM}/contacts`,

  GET_OWNERS: `${moduleAPIPath.CRM}/owners`,
  GET_COMPANIES: `${moduleAPIPath.CRM}/companies/lookup`
};
