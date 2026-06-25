package com.docx.tests.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.util.List;

/**
 * Page Object for the DocX Appointment Booking page (/book-appointment).
 */
public class AppointmentPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    /* ---------- Locators ---------- */
    private static final By SPECIALTY_SELECT  = By.cssSelector("select[name='specialty'], [id*='specialty']");
    private static final By DATE_INPUT        = By.cssSelector("input[type='date']");
    private static final By DOCTOR_CARD       = By.cssSelector("[class*='DoctorCard'], [class*='doctor-card'], [data-doctor-id]");
    private static final By TIME_SLOT         = By.cssSelector("[class*='slot'], [class*='TimeSlot']");
    private static final By BOOKED_SLOT       = By.cssSelector("[class*='booked'], [class*='disabled']");
    private static final By SUBMIT_BUTTON     = By.cssSelector("button[type='submit'], button[class*='book'], button[class*='Book']");
    private static final By PAGE_HEADING      = By.cssSelector("h1, h2");

    public AppointmentPage(WebDriver driver, WebDriverWait wait) {
        this.driver = driver;
        this.wait   = wait;
    }

    /* ---------- Actions ---------- */

    public AppointmentPage open() {
        driver.get("http://localhost:5173/book-appointment");
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_HEADING));
        return this;
    }

    public AppointmentPage openWithParams(String doctorId, String doctorName, String specialty, String consultationType, String date) {
        String url = String.format(
            "http://localhost:5173/appointment?doctorId=%s&doctorName=%s&specialty=%s&consultationType=%s&date=%s",
            doctorId, doctorName, specialty, consultationType, date
        );
        driver.get(url);
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_HEADING));
        return this;
    }

    /* ---------- Queries ---------- */

    /** Returns the number of available time slots rendered on the page. */
    public int getTimeSlotCount() {
        List<WebElement> slots = driver.findElements(TIME_SLOT);
        return slots.size();
    }

    /** Returns the number of slots marked as booked / disabled. */
    public int getBookedSlotCount() {
        List<WebElement> slots = driver.findElements(BOOKED_SLOT);
        return slots.size();
    }

    /** Returns true if the page heading is visible (page loaded). */
    public boolean isLoaded() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_HEADING));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Returns the current URL. */
    public String getCurrentUrl() {
        return driver.getCurrentUrl();
    }
}
