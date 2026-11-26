const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24" } as const;

export const Back = () => <svg {...P}><path d="m15 18-6-6 6-6" /></svg>;
export const Plus = () => <svg {...P} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>;
export const Check = () => <svg {...P}><path d="M20 6 9 17l-5-5" /></svg>;
export const Info = () => <svg {...P}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
export const Warn = () => <svg {...P}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
export const Eye = () => <svg {...P}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const Copy = () => <svg {...P}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
export const Chevron = () => <svg {...P} width={20} height={20}><path d="m9 18 6-6-6-6" /></svg>;
export const Logout = () => <svg {...P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
export const HomeI = () => <svg {...P}><path d="M3 10.5 12 3l9 7.5V21H3z" /></svg>;
export const CardI = () => <svg {...P}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
export const SubsI = () => <svg {...P}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></svg>;
export const ListI = () => <svg {...P}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
