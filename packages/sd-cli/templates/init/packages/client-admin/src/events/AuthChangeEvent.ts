import { defineEvent } from "@simplysm/service-common";

export const AuthChangeEvent = defineEvent<{ employeeId: number }, void>("AuthChangeEvent");
