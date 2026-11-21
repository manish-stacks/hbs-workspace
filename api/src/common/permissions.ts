const mods = ["company","branch","department","employee","attendance","shift","leave","payroll","crm","celebration","report","role","setting","expense","asset","recruitment","performance","helpdesk","announcement"];
const acts = ["create","view","edit","delete","approve","reject","export","manage"];
export const ALL_PERMISSIONS = mods.flatMap(m => acts.map(a => `${m}:${a}`));
export const ROLE_PRESETS: Record<string, string[]> = {
  "Company Owner": ALL_PERMISSIONS,
  "Company Admin": ALL_PERMISSIONS,
  "HR Manager": ALL_PERMISSIONS.filter(c => /^(employee|attendance|shift|leave|payroll|celebration|report|branch|department|expense|asset|recruitment|performance|helpdesk|announcement)/.test(c)),
  "Sales Manager": ALL_PERMISSIONS.filter(c => c.startsWith("crm:")),
  "Sales Executive": ["crm:view", "crm:create", "crm:edit"],
  "Branch Manager": ["employee:view","attendance:view","attendance:edit","shift:view","leave:view","leave:approve","report:view","branch:view"],
  "Employee": [],
};
