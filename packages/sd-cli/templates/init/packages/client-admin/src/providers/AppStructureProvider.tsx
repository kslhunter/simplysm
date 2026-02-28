import { lazy } from "solid-js";
import { createAppStructure } from "@simplysm/solid";
import { useAuth } from "./AuthProvider";

const MainView = lazy(() =>
  import("../views/home/main/MainView").then((m) => ({ default: m.MainView })),
);
const MyInfoDetail = lazy(() =>
  import("../views/home/my-info/MyInfoDetail").then((m) => ({ default: m.MyInfoDetail })),
);
const EmployeeSheet = lazy(() =>
  import("../views/home/base/employee/EmployeeSheet").then((m) => ({ default: m.EmployeeSheet })),
);
const RolePermissionView = lazy(() =>
  import("../views/home/base/role-permission/RolePermissionView").then((m) => ({
    default: m.RolePermissionView,
  })),
);
const SystemLogSheet = lazy(() =>
  import("../views/home/system/system-log/SystemLogSheet").then((m) => ({
    default: m.SystemLogSheet,
  })),
);

export const { AppStructureProvider, useAppStructure } = createAppStructure(() => {
  const auth = useAuth();
  return {
    permRecord: () => auth.authInfo()?.permissions,
    items: [
      {
        code: "home",
        title: "홈",
        children: [
          {
            code: "main",
            title: "메인",
            component: MainView,
          },
          {
            code: "my-info",
            title: "설정",
            component: MyInfoDetail,
            isNotMenu: true,
          },
          {
            code: "base",
            title: "기준정보",
            children: [
              {
                code: "employee",
                title: "직원",
                component: EmployeeSheet,
                perms: ["use", "edit"],
                subPerms: [
                  { title: "인증정보", code: "auth", perms: ["use", "edit"] },
                  { title: "개인정보", code: "personal", perms: ["use", "edit"] },
                  { title: "급여정보", code: "payroll", perms: ["use", "edit"] },
                ],
              },
              {
                code: "role-permission",
                title: "권한그룹",
                component: RolePermissionView,
                perms: ["use", "edit"],
              },
            ],
          },
          {
            code: "system",
            title: "시스템",
            children: [
              {
                code: "system-log",
                title: "시스템로그",
                component: SystemLogSheet,
                perms: ["use"],
              },
            ],
          },
        ],
      },
    ],
  };
});
