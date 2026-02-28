import React, { createContext, useContext } from "react";

export interface EmployerContextValue {
    employerId: string;
    employerName: string;
    role: "owner" | "admin" | "member";
    approvalStatus: "pending" | "approved" | "rejected" | "suspended";
}

const EmployerContext = createContext<EmployerContextValue | null>(null);

export function useEmployer(): EmployerContextValue {
    const ctx = useContext(EmployerContext);
    if (!ctx) throw new Error("useEmployer must be used inside EmployerRoute");
    return ctx;
}

export const EmployerProvider = EmployerContext.Provider;
