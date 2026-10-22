import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEmployee } from "./validate.ts";

const good = { fullName: "Asha Rao", email: "asha@example.com", department: "Engineering", jobTitle: "Engineer", salary: 900000, joiningDate: "2024-01-15" };
const errorsFor = (changes: object) => validateEmployee({ ...good, ...changes }).errors ?? {};

test("a valid employee passes and is cleaned", () => {
  const { value } = validateEmployee({ ...good, fullName: "  Asha Rao ", email: "  ASHA@Example.COM ", id: 5, created_at: "x" });
  assert.deepEqual(value, good);
});

test("EC-001 empty form lists every required field", () => {
  const errors = validateEmployee({}).errors!;
  assert.deepEqual(Object.keys(errors).sort(), ["department", "email", "fullName", "jobTitle", "joiningDate", "salary"]);
});

test("EC-002/003 whitespace-only text is rejected", () => {
  assert.ok(errorsFor({ fullName: "   " }).fullName);
  assert.ok(errorsFor({ jobTitle: "   " }).jobTitle);
});

test("EC-005/006/007 bad emails are rejected", () => {
  for (const email of ["", "no-at-sign", "a@b", "a@b.", "a@.com", "a b@c.com", "a@b c.com", "a@b.c", "a@@b.com", "a@b..com"]) {
    assert.ok(errorsFor({ email }).email, `should reject "${email}"`);
  }
});

test("EC-012 unknown department is rejected", () => {
  assert.ok(errorsFor({ department: "Piracy" }).department);
  assert.ok(errorsFor({ department: "" }).department);
});

test("EC-015..021 salary rules", () => {
  assert.ok(errorsFor({ salary: -1 }).salary);
  for (const salary of ["abc", "1e5", NaN, Infinity, null, undefined, "", {}]) assert.ok(errorsFor({ salary }).salary, `should reject ${String(salary)}`);
  assert.ok(errorsFor({ salary: 10.123 }).salary, "3 decimals");
  assert.ok(errorsFor({ salary: 10_000_000_000 }).salary, "over NUMERIC(12,2)");
  assert.equal(errorsFor({ salary: 0 }).salary, undefined, "zero is allowed");
  assert.equal(errorsFor({ salary: 1234.5 }).salary, undefined, "2 decimals or fewer is allowed");
  assert.equal(errorsFor({ salary: 0.07 }).salary, undefined);
  assert.equal(errorsFor({ salary: 9_999_999_999.99 }).salary, undefined, "maximum is allowed");
});

test("EC-022/023/024 dates", () => {
  assert.ok(errorsFor({ joiningDate: "" }).joiningDate);
  for (const joiningDate of ["2024-02-30", "2023-02-29", "2024-13-01", "24-01-01", "2024-1-1", "not a date", "1899-12-31", "2101-01-01"]) {
    assert.ok(errorsFor({ joiningDate }).joiningDate, `should reject ${joiningDate}`);
  }
  assert.equal(errorsFor({ joiningDate: "2024-02-29" }).joiningDate, undefined, "leap day");
  assert.equal(errorsFor({ joiningDate: "2031-01-01" }).joiningDate, undefined, "future dates are allowed");
});

test("EC-025..027 length limits reject instead of truncating", () => {
  assert.ok(errorsFor({ fullName: "a".repeat(101) }).fullName);
  assert.ok(errorsFor({ jobTitle: "a".repeat(101) }).jobTitle);
  assert.ok(errorsFor({ email: `${"a".repeat(250)}@b.com` }).email);
  assert.equal(errorsFor({ fullName: "a".repeat(100) }).fullName, undefined);
});

test("EC-030 body that is not an object is rejected", () => {
  for (const body of [null, [], "text", 5, undefined]) assert.ok(validateEmployee(body).errors, `should reject ${JSON.stringify(body)}`);
});

test("EC-082 international names are kept", () => {
  assert.equal(validateEmployee({ ...good, fullName: "Zoë Müller 李雷 அசோக்" }).value?.fullName, "Zoë Müller 李雷 அசோக்");
});

test("EC-083/084 SQL and HTML text is just text", () => {
  const name = "Robert'); DROP TABLE employees;-- <script>alert(1)</script>";
  assert.equal(validateEmployee({ ...good, fullName: name }).value?.fullName, name);
});
