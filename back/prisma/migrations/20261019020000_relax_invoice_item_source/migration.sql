-- Al anular una factura (RN-74) sus lineas se conservan pero sueltan el concepto de origen para poder refacturarlo.
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_one_source_chk";
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_one_source_chk"
    CHECK ("consultationId" IS NULL OR "vaccinationId" IS NULL);
