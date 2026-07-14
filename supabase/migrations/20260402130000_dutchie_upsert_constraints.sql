-- Add non-partial unique constraints for Dutchie sync upserts.
-- PostgREST ON CONFLICT requires real constraints, not partial indexes.

-- Employees: upsert by dutchie_employee_id per org
ALTER TABLE employees
  ADD CONSTRAINT employees_org_dutchie_emp_key
  UNIQUE (organization_id, dutchie_employee_id);

-- Customers: upsert by dutchie_customer_id per org
ALTER TABLE customers
  ADD CONSTRAINT customers_org_dutchie_cust_key
  UNIQUE (organization_id, dutchie_customer_id);

-- Products: upsert by dutchie_product_id per org
ALTER TABLE products
  ADD CONSTRAINT products_org_dutchie_prod_key
  UNIQUE (organization_id, dutchie_product_id);

-- Inventory: upsert by external_package_id per location
ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_loc_ext_pkg_key
  UNIQUE (location_id, external_package_id);
