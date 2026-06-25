package com.docx.tests;

import com.docx.tests.base.BaseTest;
import com.docx.tests.pages.SignupPage;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Automated UI tests for the Patient Registration / Signup flow (/signup).
 *
 * Test Strategy:
 *   Registration is a one-time but high-impact flow. An error here means
 *   zero new patients can onboard – catastrophic for an e-hospital.
 *   We automate the most error-prone validations (mismatched passwords,
 *   missing required fields, invalid email) to catch regressions instantly.
 */
public class SignupValidationTest extends BaseTest {

    private SignupPage signupPage;

    @BeforeMethod
    public void initPage() {
        signupPage = new SignupPage(driver, wait);
    }

    /* ================================================================== */
    /*  TC-SIGNUP-001 : Page loads correctly                               */
    /* ================================================================== */

    @Test(priority = 1, description = "Verify signup page loads and form fields are visible")
    public void testSignupPageLoads() {
        signupPage.open();
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/signup"),
            "URL should contain /signup"
        );
    }

    /* ================================================================== */
    /*  TC-SIGNUP-002 : Empty form submission triggers validation          */
    /* ================================================================== */

    @Test(priority = 2, description = "Submit empty signup form and verify validation errors")
    public void testEmptyFormValidation() {
        signupPage.open();
        signupPage.clickSubmit();

        Assert.assertTrue(
            signupPage.hasFieldError(),
            "Validation errors should appear for empty form submission"
        );
    }

    /* ================================================================== */
    /*  TC-SIGNUP-003 : Invalid email format                               */
    /* ================================================================== */

    @Test(priority = 3, description = "Enter invalid email and verify email validation error")
    public void testInvalidEmailValidation() {
        signupPage.open();
        signupPage.enterFirstName("Test");
        signupPage.enterLastName("User");
        signupPage.enterEmail("bad-email");
        signupPage.enterPassword("ValidPass@123");
        signupPage.enterConfirmPassword("ValidPass@123");
        signupPage.clickSubmit();

        Assert.assertTrue(
            signupPage.hasFieldError(),
            "Validation error should appear for invalid email format"
        );
    }

    /* ================================================================== */
    /*  TC-SIGNUP-004 : Password mismatch                                  */
    /* ================================================================== */

    @Test(priority = 4, description = "Enter mismatched passwords and verify error")
    public void testPasswordMismatch() {
        signupPage.open();
        signupPage.enterFirstName("Test");
        signupPage.enterLastName("User");
        signupPage.enterEmail("test@example.com");
        signupPage.enterPassword("ValidPass@123");
        signupPage.enterConfirmPassword("DifferentPass@456");
        signupPage.clickSubmit();

        Assert.assertTrue(
            signupPage.hasFieldError(),
            "Validation error should appear when passwords do not match"
        );
    }

    /* ================================================================== */
    /*  TC-SIGNUP-005 : Weak password (too short / no special chars)       */
    /* ================================================================== */

    @Test(priority = 5, description = "Enter a weak password and verify strength validation")
    public void testWeakPasswordValidation() {
        signupPage.open();
        signupPage.enterFirstName("Test");
        signupPage.enterLastName("User");
        signupPage.enterEmail("test@example.com");
        signupPage.enterPassword("123");
        signupPage.enterConfirmPassword("123");
        signupPage.clickSubmit();

        Assert.assertTrue(
            signupPage.hasFieldError(),
            "Validation error should appear for a weak password"
        );
    }
}
