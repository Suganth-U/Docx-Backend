package com.docx.tests.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * Page Object for the DocX Signup page (/signup).
 */
public class SignupPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    /* ---------- Locators ---------- */
    private static final By FIRST_NAME_INPUT = By.id("signup-firstName");
    private static final By LAST_NAME_INPUT  = By.id("signup-lastName");
    private static final By EMAIL_INPUT      = By.id("signup-email");
    private static final By PASSWORD_INPUT   = By.id("signup-password");
    private static final By CONFIRM_PW_INPUT = By.id("signup-confirmPassword");
    private static final By SUBMIT_BUTTON    = By.cssSelector("button[type='submit']");
    private static final By ERROR_HINT       = By.cssSelector("[class*='FieldHint']");

    public SignupPage(WebDriver driver, WebDriverWait wait) {
        this.driver = driver;
        this.wait   = wait;
    }

    /* ---------- Actions ---------- */

    public SignupPage open() {
        driver.get("http://localhost:5173/signup");
        wait.until(ExpectedConditions.visibilityOfElementLocated(EMAIL_INPUT));
        return this;
    }

    public SignupPage enterFirstName(String name) {
        WebElement el = driver.findElement(FIRST_NAME_INPUT);
        el.clear();
        el.sendKeys(name);
        return this;
    }

    public SignupPage enterLastName(String name) {
        WebElement el = driver.findElement(LAST_NAME_INPUT);
        el.clear();
        el.sendKeys(name);
        return this;
    }

    public SignupPage enterEmail(String email) {
        WebElement el = driver.findElement(EMAIL_INPUT);
        el.clear();
        el.sendKeys(email);
        return this;
    }

    public SignupPage enterPassword(String password) {
        WebElement el = driver.findElement(PASSWORD_INPUT);
        el.clear();
        el.sendKeys(password);
        return this;
    }

    public SignupPage enterConfirmPassword(String password) {
        WebElement el = driver.findElement(CONFIRM_PW_INPUT);
        el.clear();
        el.sendKeys(password);
        return this;
    }

    public SignupPage clickSubmit() {
        driver.findElement(SUBMIT_BUTTON).click();
        return this;
    }

    /* ---------- Queries ---------- */

    public boolean hasFieldError() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR_HINT));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getFieldErrorText() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR_HINT)).getText();
    }
}
