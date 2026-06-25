# DocX – Automated UI Testing with Selenium & TestNG

## Prerequisites

1. **Java 17+** installed (`java -version`)
2. **Maven** installed (`mvn -version`)
3. **Google Chrome** browser installed
4. **DocX dev server** running at `http://localhost:5173`

> ChromeDriver is managed automatically by WebDriverManager – no manual download needed.

---

## Project Structure

```
selenium-tests/
├── pom.xml                                    # Maven config (dependencies)
├── src/test/
│   ├── java/com/docx/tests/
│   │   ├── base/
│   │   │   └── BaseTest.java                  # Browser setup/teardown
│   │   ├── pages/
│   │   │   ├── LoginPage.java                 # Page Object – Login
│   │   │   ├── SignupPage.java                # Page Object – Signup
│   │   │   └── AppointmentPage.java           # Page Object – Appointment
│   │   ├── PatientLoginTest.java              # 7 test cases
│   │   ├── SignupValidationTest.java          # 5 test cases
│   │   └── AppointmentBookingTest.java        # 5 test cases
│   └── resources/
│       └── testng.xml                         # TestNG suite definition
└── README.md
```

---

## How to Run

### Step 1: Start DocX

```bash
cd /Applications/DocX
npm run dev
```

### Step 2: Run All Tests

```bash
cd /Applications/DocX/selenium-tests
mvn clean test
```

### Step 3: View Results

- **Console**: Pass/fail summary prints after `mvn test`
- **HTML Report**: `selenium-tests/target/surefire-reports/index.html`
- **TestNG Report**: `selenium-tests/target/surefire-reports/emailable-report.html`

---

## Test Cases Summary

| ID             | Test                                  | Type       | Module          |
|----------------|---------------------------------------|------------|-----------------|
| TC-LOGIN-001   | Login page loads                      | Smoke      | Authentication  |
| TC-LOGIN-002   | Empty form validation                 | Negative   | Authentication  |
| TC-LOGIN-003   | Invalid email format                  | Negative   | Authentication  |
| TC-LOGIN-004   | Short password validation             | Negative   | Authentication  |
| TC-LOGIN-005   | Wrong credentials error               | Negative   | Authentication  |
| TC-LOGIN-006   | Successful login redirect (disabled)  | Positive   | Authentication  |
| TC-LOGIN-007   | Doctor login tab switch               | Smoke      | Authentication  |
| TC-SIGNUP-001  | Signup page loads                     | Smoke      | Registration    |
| TC-SIGNUP-002  | Empty form validation                 | Negative   | Registration    |
| TC-SIGNUP-003  | Invalid email validation              | Negative   | Registration    |
| TC-SIGNUP-004  | Password mismatch                     | Negative   | Registration    |
| TC-SIGNUP-005  | Weak password validation              | Negative   | Registration    |
| TC-APPT-001   | Appointment page loads                | Smoke      | Booking         |
| TC-APPT-002   | Parameterized URL loads               | Smoke      | Booking         |
| TC-APPT-003   | Find Doctors navigation               | Smoke      | Navigation      |
| TC-APPT-004   | Pharmacy page loads                   | Smoke      | Navigation      |
| TC-APPT-005   | FAQ page loads                        | Smoke      | Navigation      |

---

## Design Patterns Used

- **Page Object Model (POM)**: Each page has a dedicated class that encapsulates selectors and actions, keeping tests readable and maintainable.
- **BaseTest abstraction**: Browser lifecycle (setup/teardown) is centralised so test classes only contain assertions.
- **WebDriverManager**: Automatically downloads the correct ChromeDriver binary – no manual version management.
- **TestNG groups**: Tests are organised into logical suites via `testng.xml` for selective execution.
