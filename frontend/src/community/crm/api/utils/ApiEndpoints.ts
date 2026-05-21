export const crmEndpoints = {
  CREATE_CONTACT: `contact`,

  GET_OWNERS: `contact/owners`,
  GET_COMPANIES: `company/lookup`
}

export const companyEndpoints = {
  CREATE_COMPANY: "/company",
  CHECK_COMPANY_NAME_EXISTS: (name: string) =>
    `/company/exists?name=${encodeURIComponent(name)}`
};
