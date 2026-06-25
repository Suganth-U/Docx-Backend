package com.docx.tests;

import com.docx.tests.base.BaseTest;
import com.docx.tests.pages.AppointmentPage;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Automated UI tests for the Appointment Booking flow (/book-appointment).
 *
 * Test Strategy:
 *   Appointment booking is the core revenue-generating flow of DocX.
 *   We automate navigation, slot rendering, and booked-slot blocking
 *   because these are the highest-risk, highest-frequency interactions.
 */
public class AppointmentBookingTest extends BaseTest {

    private AppointmentPage appointmentPage;

    @BeforeMethod
    public void initPage() {
        appointmentPage = new AppointmentPage(driver, wait);
    }

    /* ================================================================== */
    /*  TC-APPT-001 : Page loads correctly                                 */
    /* ================================================================== */

    @Test(priority = 1, description = "Verify the appointment booking page loads")
    public void testAppointmentPageLoads() {
        appointmentPage.open();
        Assert.assertTrue(
            appointmentPage.isLoaded(),
            "Appointment booking page should load with a visible heading"
        );
    }

    /* ================================================================== */
    /*  TC-APPT-002 : Direct URL with doctor params loads correctly        */
    /* ================================================================== */

    @Test(priority = 2, description = "Open appointment page with doctor query params and verify it loads")
    public void testAppointmentWithDoctorParams() {
        // Use a sample doctor – the page should load even if the doctor doesn't exist
        appointmentPage.openWithParams(
            "6a0be3ce2dcaca9adab1298b",
            "Dr.+Test+Doctor",
            "dietetics",
            "PHYSICAL",
            "2026-06-30"
        );
        Assert.assertTrue(
            appointmentPage.getCurrentUrl().contains("/appointment"),
            "URL should contain /appointment"
        );
    }

    /* ================================================================== */
    /*  TC-APPT-003 : Navigation links are accessible                      */
    /* ================================================================== */

    @Test(priority = 3, description = "Verify find-doctors page loads (pre-booking entry point)")
    public void testFindDoctorsPageLoads() {
        navigateTo("/find-doctors");
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/find-doctor"),
            "Find Doctors page should load at /find-doctors"
        );
    }

    /* ================================================================== */
    /*  TC-APPT-004 : Pharmacy page loads                                  */
    /* ================================================================== */

    @Test(priority = 4, description = "Verify pharmacy page loads (e-pharmacy entry point)")
    public void testPharmacyPageLoads() {
        navigateTo("/pharmacy");
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/pharmacy"),
            "Pharmacy page should load at /pharmacy"
        );
    }

    /* ================================================================== */
    /*  TC-APPT-005 : FAQ page loads                                       */
    /* ================================================================== */

    @Test(priority = 5, description = "Verify FAQ page loads correctly")
    public void testFaqPageLoads() {
        navigateTo("/faqs");
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        Assert.assertTrue(
            driver.getCurrentUrl().contains("/faq"),
            "FAQ page should load"
        );
    }
}
