package com.docx.tests.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * Page Object for the DocX Login page (/login).
 *
 * Encapsulates all element locators and user-facing actions so that
 * test classes never contain raw selectors – following the Page Object Model (POM).
 */
public class LoginPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    /* ---------- Locators ---------- */
    private static final By EMAIL_INPUT    = By.id("login-email");
    private static final By PASSWORD_INPUT = By.id("login-password");
    private static final By SUBMIT_BUTTON  = By.cssSelector("button[type='submit']");
    private static final By ERROR_HINT     = By.cssSelector("[class*='FieldHint']");
    private static final By SUCCESS_MODAL  = By.cssSelector("[class*='StatusModal']");

    public LoginPage(WebDriver driver, WebDriverWait wait) {
        this.driver = driver;
        this.wait   = wait;
    }

    /* ---------- Actions ---------- */

    /** Navigate to the patient login page. */
    public LoginPage open() {
        driver.get("http://localhost:5173/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(EMAIL_INPUT));
        return this;
    }

    /** Navigate to the doctor login page. */
    public LoginPage openDoctorLogin() {
        driver.get("http://localhost:5173/login?role=doctor");
        wait.until(ExpectedConditions.visibilityOfElementLocated(EMAIL_INPUT));
        return this;
    }

    /** Type an email address into the email field. */
    public LoginPage enterEmail(String email) {
        WebElement el = driver.findElement(EMAIL_INPUT);
        el.clear();
        el.sendKeys(email);
        return this;
    }

    /** Type a password into the password field. */
    public LoginPage enterPassword(String password) {
        WebElement el = driver.findElement(PASSWORD_INPUT);
        el.clear();
        el.sendKeys(password);
        return this;
    }

    /** Click the Login / Submit button. */
    public LoginPage clickSubmit() {
        driver.findElement(SUBMIT_BUTTON).click();
        return this;
    }

    /** Convenience: fill both fields and submit in one call. */
    public LoginPage loginAs(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        clickSubmit();
        return this;
    }

    /* ---------- Assertions / Queries ---------- */

    /** Returns true if at least one inline validation hint is visible. */
    public boolean hasFieldError() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR_HINT));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Returns the text content of the first visible field-error hint. */
    public String getFieldErrorText() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR_HINT)).getText();
    }

    /** Returns true if the success modal ("Login Successful") appears. */
    public boolean isSuccessModalVisible() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(SUCCESS_MODAL));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Returns the current page title from the browser tab. */
    public String getPageTitle() {
        return driver.getTitle();
    }

    /** Returns true when the URL changes away from /login (successful redirect). */
    public boolean isRedirectedAwayFromLogin() {
        try {
            wait.until(ExpectedConditions.not(
                ExpectedConditions.urlContains("/login")
            ));
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
