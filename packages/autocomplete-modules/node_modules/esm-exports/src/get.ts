export const get = (path, obj) => path.split('.').reduce((acc, current) => acc && acc[current], obj);
