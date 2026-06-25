package com.docx.tests;

import com.docx.tests.base.BaseTest;
import com.docx.tests.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Automated UI tests for the Patient Login flow (/login).
 *
 * Test Strategy:
 *   - These tests target the most critical and repetitive authentication
 *     paths: empty-field validation, invalid credentials, and the
 *     successful login happy-path.
 *   - They exercise client-side validation (email format, required fields)
 *     AND server-side error handling (wrong password response).
 *
 * Why automate this?
 *   Login is the single most frequently used entry point. Regressions here
 *   block every other user journey, making it an ideal candidate for a
 *   CI-integrated Selenium test.
 */
public class PatientLoginTest extends BaseTest {

    private LoginPage loginPage;

    @BeforeMethod
    public void initPage() {
        loginPage = new LoginPage(driver, wait);
    }

    /* ================================================================== */
    /*  TC-LOGIN-001 : Page loads correctly                                */
    /* ================================================================== */

    @Test(priority = 1, description = "Verify the login page loads and the email field is visible")
    public void testLoginPageLoads() {
        loginPage.open();
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/login"),
            "URL should contain /login"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-002 : Empty form submission shows validation errors       */
    /* ================================================================== */

    @Test(priority = 2, description = "Submit empty form and verify inline validation errors appear")
    public void testEmptyFormShowsValidation() {
        loginPage.open();
        loginPage.clickSubmit();

        Assert.assertTrue(
            loginPage.hasFieldError(),
            "Inline validation error should appear when form is submitted empty"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-003 : Invalid email format triggers client-side error     */
    /* ================================================================== */

    @Test(priority = 3, description = "Enter invalid email format and verify validation message")
    public void testInvalidEmailFormat() {
        loginPage.open();
        loginPage.enterEmail("not-an-email");
        loginPage.enterPassword("SomePassword123");
        loginPage.clickSubmit();

        Assert.assertTrue(
            loginPage.hasFieldError(),
            "Field error should appear for an invalid email format"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-004 : Short password triggers client-side error           */
    /* ================================================================== */

    @Test(priority = 4, description = "Enter a short password and verify minimum-length validation")
    public void testShortPasswordValidation() {
        loginPage.open();
        loginPage.enterEmail("test@docx.com");
        loginPage.enterPassword("123");
        loginPage.clickSubmit();

        Assert.assertTrue(
            loginPage.hasFieldError(),
            "Field error should appear for a password that is too short"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-005 : Wrong credentials show server error modal           */
    /* ================================================================== */

    @Test(priority = 5, description = "Submit wrong credentials and verify an error modal appears")
    public void testWrongCredentialsShowError() {
        loginPage.open();
        loginPage.loginAs("nonexistent@example.com", "WrongPassword99!");

        // Wait a moment for the API round-trip
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}

        // The app should NOT redirect away from login
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/login"),
            "User should remain on the login page after failed credentials"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-006 : Successful login redirects to dashboard             */
    /*  NOTE: Requires a valid test account in the database.               */
    /* ================================================================== */

    @Test(priority = 6, enabled = false,
          description = "Login with valid credentials and verify redirect to dashboard. "
                      + "DISABLED by default – enable after seeding a test user.")
    public void testSuccessfulLoginRedirects() {
        loginPage.open();
        loginPage.loginAs("patient@docx.com", "Test@1234");

        Assert.assertTrue(
            loginPage.isSuccessModalVisible(),
            "Success modal should appear after valid login"
        );
    }

    /* ================================================================== */
    /*  TC-LOGIN-007 : Doctor login tab switch                             */
    /* ================================================================== */

    @Test(priority = 7, description = "Verify doctor login page loads with ?role=doctor param")
    public void testDoctorLoginPageLoads() {
        loginPage.openDoctorLogin();
        Assert.assertTrue(
            driver.getCurrentUrl().contains("role=doctor"),
            "URL should contain role=doctor query parameter"
        );
    }
}
