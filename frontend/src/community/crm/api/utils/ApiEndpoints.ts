export const contactEndpoints = {
  CREATE_CONTACT: `contact`,
  GET_OWNERS: `contact/owners`,
  GET_COMPANIES: `company/lookup`
}

export const companyEndpoints = {
  GET_COMPANY_METRICS: "/company/metrics",
  CREATE_COMPANY: "/company",
  CHECK_COMPANY_NAME_EXISTS: (name: string) =>
    `/company/exists?name=${encodeURIComponent(name)}`
};
