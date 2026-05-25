import {
  AvatarChip,
  ButtonV2,
  CloseIcon as SkappCloseIcon,
  InputField,
  SearchableDropdown
} from "@rootcodelabs/skapp-ui";
import { useFormik } from "formik";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";

import CloseIcon from "~community/common/assets/Icons/CloseIcon";
import PlusIcon from "~community/common/assets/Icons/PlusIcon";
import { characterLengths } from "~community/common/constants/stringConstants";
import { ToastType } from "~community/common/enums/ComponentEnums";
import { useTranslator } from "~community/common/hooks/useTranslator";
import useSessionData from "~community/common/hooks/useSessionData";
import { useToast } from "~community/common/providers/ToastProvider";
import { useGetUserPersonalDetails } from "~community/people/api/PeopleApi";
import useGetDefaultCountryCode from "~community/people/hooks/useGetDefaultCountryCode";
import {
  useCreateContact,
  useGetCrmCompanies,
  useGetCrmOwners
} from "~community/crm/api/CrmContactsApi";
import { useCrmStore } from "~community/crm/store/store";
import { ContactOwner, CreateContactPayload } from "~community/crm/types/CommonTypes";
import { CrmModalTypes } from "~community/crm/types/ModalTypes";
import { isValidPhoneNumber } from "~community/common/regex/regexPatterns";

type DropdownItem = { id: string; content: ReactNode };

const ADD_COMPANY_ID = "__add_company__";

interface CreateContactFormValues {
  name: string;
  email: string;
  company: string;
  companyId: number | null;
  contactNumber: string;
  countryCode: string;
  ownerId: number | null;
}

const getFullName = (owner: ContactOwner) =>
  [owner.firstName, owner.lastName].filter(Boolean).join(" ");

const CreateContactModal = () => {
  const { setToastMessage } = useToast();

  const translateText = useTranslator(
    "crmModule",
    "contacts",
    "createContactModal"
  );

  const countryCode = useGetDefaultCountryCode();
  const { setIsAddContactModalOpen, setCrmModalType } = useCrmStore((state) => state);
  const { isCrmAdmin, isCrmSalesManager, isCrmSalesRepresentative, isSuperAdmin } = useSessionData();
  const { data: me } = useGetUserPersonalDetails();

  const crmRole = useMemo((): ContactOwner["crmRole"] => {
    if (isCrmAdmin) return "CRM_ADMIN";
    if (isCrmSalesManager) return "CRM_SALES_MANAGER";
    return "CRM_SALES_REPRESENTATIVE";
  }, [isCrmAdmin, isCrmSalesManager]);

  const defaultOwner = useMemo((): ContactOwner | null => {
    if (!me?.employeeId) return null;
    return {
      employeeId: me.employeeId as number,
      firstName: me.firstName ?? "",
      lastName: me.lastName ?? "",
      email: me.email ?? "",
      authPic: (me.authPic as string | null) ?? null,
      crmRole
    };
  }, [me, crmRole]);

  const [selectedOwner, setSelectedOwner] = useState<ContactOwner | null>(null);
  const [previousOwner, setPreviousOwner] = useState<ContactOwner | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const ownerSectionRef = useRef<HTMLDivElement>(null);

  const { data: companiesData } = useGetCrmCompanies({ page: 0, size: 100 });
  const { data: ownersData } = useGetCrmOwners({ page: 0, size: 100 });

  const companyOptions = (companiesData?.items ?? []).map((c) => ({
    id: c.id,
    name: c.name
  }));

  const ownerOptions: ContactOwner[] = (ownersData?.items ?? []).map((o) => ({
    employeeId: o.employeeId,
    firstName: o.firstName,
    lastName: o.lastName,
    email: o.email,
    authPic: o.authPic,
    crmRole: o.crmRole
  }));

  const handleSuccess = () => {
    setSubmitting(false);
    handleCloseModal();
    setToastMessage({
      open: true,
      toastType: ToastType.SUCCESS,
      title: translateText(["toasts", "successTitle"]),
      description: translateText(["toasts", "successDescription"])
    });
  };

  const handleError = () => {
    setSubmitting(false);
    setToastMessage({
      open: true,
      toastType: ToastType.ERROR,
      title: translateText(["toasts", "errorTitle"]),
      description: translateText(["toasts", "errorDescription"])
    });
  };

  const handleCloseModal = (): void => {
    setIsAddContactModalOpen(false);
    setCrmModalType(CrmModalTypes.ADD_CONTACT_MODAL);
  };

  const { mutate: createContact, isPending } = useCreateContact(handleSuccess, handleError);

  const submitContact = (values: CreateContactFormValues) => {
    const payload: CreateContactPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      companyId: values.companyId ?? undefined,
      contactNumber: values.contactNumber
        ? `+${values.countryCode}${values.contactNumber}`
        : undefined,
      ownerId: values.ownerId ?? undefined
    };

    createContact(payload);
  };

  const validationSchema = Yup.object({
    name: Yup.string().required(translateText(["validations", "contactNameRequired"])),
    email: Yup.string()
      .required(translateText(["validations", "emailRequired"]))
      .email(translateText(["validations", "emailInvalid"])),
    contactNumber: Yup.string()
      .nullable()
      .optional()
      .test(
        "valid-contact-number",
        translateText(["validations", "contactNumber"]),
        function (inputContactNumber) {
          if (!inputContactNumber || inputContactNumber === "") {
            return true;
          }
          return isValidPhoneNumber().test(inputContactNumber);
        }
      )
      .max(
        characterLengths.PHONE_NUMBER_LENGTH_MAX,
        translateText(["validations", "contactNumberLength"])
      )
  });

  const formik = useFormik<CreateContactFormValues>({
    initialValues: {
      name: "",
      email: "",
      company: "",
      companyId: null,
      contactNumber: "",
      countryCode,
      ownerId: defaultOwner?.employeeId ?? null
    },
    onSubmit: submitContact,
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    enableReinitialize: true
  });

  const {
    values,
    errors,
    handleChange,
    isSubmitting,
    setFieldValue,
    setSubmitting,
    submitForm
  } = formik;

  useEffect(() => {
    if (defaultOwner && !selectedOwner) {
      setSelectedOwner(defaultOwner);
      setFieldValue("ownerId", defaultOwner.employeeId);
    }
  }, [defaultOwner]);

  // Restore previous owner when clicking outside the owner section without selecting a new one
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ownerSectionRef.current &&
        !ownerSectionRef.current.contains(event.target as Node)
      ) {
        if (!selectedOwner && previousOwner) {
          setSelectedOwner(previousOwner);
          setFieldValue("ownerId", previousOwner.employeeId);
          setPreviousOwner(null);
          setOwnerSearch("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOwner, previousOwner]);

  const handleOwnerSelect = (owner: ContactOwner) => {
    setPreviousOwner(null);
    setSelectedOwner(owner);
    setFieldValue("ownerId", owner.employeeId);
    setOwnerSearch("");
  };

  const handleOwnerClear = () => {
    setPreviousOwner(selectedOwner);
    setSelectedOwner(null);
    setFieldValue("ownerId", null);
  };

  const isOwnerReadonly =
    isCrmSalesRepresentative && !isCrmSalesManager && !isCrmAdmin && !isSuperAdmin;

  const filteredCompanyItems = useMemo((): DropdownItem[] => {
    if (!values.company.trim()) return [];

    const matches = companyOptions
      .filter((c) => c.name.toLowerCase().includes(values.company.toLowerCase()))
      .map((c) => ({
        id: String(c.id),
        content: <span className="body2 text-primary-text">{c.name}</span>
      }));

    const addItem: DropdownItem = {
      id: ADD_COMPANY_ID,
      content: (
        <div className="flex items-center justify-between -mx-4 -my-2 px-4 py-3 border-t border-secondary-accent bg-primary/10 hover:bg-primary/15">
          <span className="body2 font-medium text-primary truncate">
            {translateText(["buttons", "addCompany"])}
          </span>
          <PlusIcon fill="currentColor" width="16" height="16" />
        </div>
      )
    };

    // When no matches, show no-results text before the add button via emptyMessage.
    // When matches exist, append the add button as the last item.
    return matches.length > 0 ? [...matches, addItem] : [];
  }, [companyOptions, values.company]);

  const filteredOwnerItems = useMemo((): DropdownItem[] => {
    if (!ownerSearch.trim()) return [];
    return ownerOptions
      .filter((o) =>
        getFullName(o).toLowerCase().includes(ownerSearch.toLowerCase())
      )
      .map((o) => ({
        id: String(o.employeeId),
        content: (
          <AvatarChip
            label={getFullName(o)}
            avatarProps={{
              src: o.authPic ?? undefined,
              firstName: o.firstName,
              lastName: o.lastName ?? "",
              size: "sm"
            }}
            showActionButton={false}
          />
        )
      }));
  }, [ownerOptions, ownerSearch]);

  const companyEmptyMessage = (
    <div className="flex flex-col w-full">
      <div className="px-4 py-3 text-center body2 text-secondary-text">
        {translateText(["noResults", "company"])}
      </div>
      <button
        type="button"
        className="w-full bg-primary-background hover:bg-primary-background/80 border-t border-secondary-accent border-x-0 border-b-0 px-4 py-3 rounded-b-md flex items-center justify-between outline-none focus:shadow-[0px_0px_4px_0px_rgba(0,0,0,0.60)]"
        onClick={() => {}}
      >
        <span className="body2 text-primary-text truncate">
          {translateText(["buttons", "addCompany"])}
        </span>
        <PlusIcon width="16" height="16" />
      </button>
    </div>
  );

  const ownerEmptyMessage = (
    <div className="px-4 py-3 text-center body2 text-secondary-text">
      {translateText(["noResults", "owner"])}
    </div>
  );

  return (
    <div className="flex flex-col h-full justify-between gap-[0.625rem]">
      <InputField
        name="name"
        label={translateText(["labels", "contactName"])}
        placeholder={translateText(["placeholders", "contactName"])}
        value={values.name}
        errorMessage={errors.name || ""}
        state={errors.name ? "error" : "default"}
        required
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "contactName"])}
        fullWidth
      />

      <InputField
        name="email"
        label={translateText(["labels", "email"])}
        placeholder={translateText(["placeholders", "email"])}
        value={values.email}
        errorMessage={errors.email || ""}
        state={errors.email ? "error" : "default"}
        required
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "email"])}
        fullWidth
      />

      <SearchableDropdown
        id="company-search"
        items={filteredCompanyItems}
        onSelect={(item) => {
          if (item.id === ADD_COMPANY_ID) return;
          const company = companyOptions.find((c) => String(c.id) === item.id);
          if (company) {
            setFieldValue("company", company.name);
            setFieldValue("companyId", company.id);
          }
        }}
        emptyMessage={companyEmptyMessage}
        inputFieldProps={{
          label: translateText(["labels", "company"]),
          placeholder: translateText(["placeholders", "company"]),
          value: values.company,
          onChange: (e) => {
            setFieldValue("company", e.target.value);
            setFieldValue("companyId", null);
          },
          "aria-label": translateText(["ariaLabels", "company"])
        }}
      />

      <InputField
        name="contactNumber"
        label={translateText(["labels", "contactNo"])}
        placeholder={translateText(["placeholders", "contactNo"])}
        value={values.contactNumber}
        errorMessage={errors.contactNumber || ""}
        state={errors.contactNumber ? "error" : "default"}
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "contactNo"])}
        fullWidth
      />

      <div ref={ownerSectionRef}>
      {selectedOwner ? (
        <div className="w-full">
          <label className="subtitle1 leading-normal text-black block mb-2">
            {translateText(["labels", "contactOwner"])}
          </label>
          <div className="h-12 rounded-lg bg-gray-100 flex items-center px-3">
            <AvatarChip
              label={getFullName(selectedOwner)}
              avatarProps={{
                src: selectedOwner.authPic ?? undefined,
                firstName: selectedOwner.firstName,
                lastName: selectedOwner.lastName ?? "",
                size: "sm"
              }}
              showActionButton={!isOwnerReadonly}
              onActionClick={isOwnerReadonly ? undefined : handleOwnerClear}
              actionIcon={isOwnerReadonly ? undefined : <SkappCloseIcon />}
              actionButtonAriaLabel="Remove owner"
            />
          </div>
        </div>
      ) : !isOwnerReadonly ? (
        <SearchableDropdown
          id="owner-search"
          items={filteredOwnerItems}
          onSelect={(item) => {
            const owner = ownerOptions.find(
              (o) => String(o.employeeId) === item.id
            );
            if (owner) handleOwnerSelect(owner);
          }}
          emptyMessage={ownerEmptyMessage}
          inputFieldProps={{
            label: translateText(["labels", "contactOwner"]),
            placeholder: translateText(["placeholders", "contactOwner"]),
            value: ownerSearch,
            onChange: (e) => setOwnerSearch(e.target.value),
            "aria-label": translateText(["ariaLabels", "contactOwner"])
          }}
        />
      ) : null}
      </div>

      <div className="flex flex-row justify-end py-[0.85rem] gap-[1rem]">
        <ButtonV2
          variant="tertiary"
          type="button"
          disabled={isSubmitting}
          onClick={handleCloseModal}
          icon={<CloseIcon />}
          iconPosition="end"
          aria-label={translateText(["ariaLabels", "cancel"])}
        >
          {translateText(["buttons", "cancel"])}
        </ButtonV2>
        <ButtonV2
          variant="primary"
          type="button"
          onClick={() => submitForm()}
          disabled={isSubmitting || isPending}
          aria-label={translateText(["ariaLabels", "save"])}
        >
          {translateText(["buttons", "save"])}
        </ButtonV2>
      </div>
    </div>
  );
};

export default CreateContactModal;
