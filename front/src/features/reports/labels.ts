const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

// "12,5 %", como escribe los porcentajes es-CO.
export const formatPercent = (value: number) => `${percentFormatter.format(value)} %`;

export const appointmentsCount = (count: number) => `${count} ${count === 1 ? "cita" : "citas"}`;

export const invoicesCount = (count: number) => `${count} ${count === 1 ? "factura" : "facturas"}`;
