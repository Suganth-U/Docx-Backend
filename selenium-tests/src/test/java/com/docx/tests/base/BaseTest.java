package com.docx.tests.base;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.BeforeSuite;

import java.time.Duration;

/**
 * Base class for all DocX Selenium tests.
 * Handles browser lifecycle (setup / teardown) so every test class
 * can simply extend this and focus on assertions.
 */
public abstract class BaseTest {

    protected WebDriver driver;
    protected WebDriverWait wait;

    /** Base URL of the running DocX frontend (Vite dev server). */
    protected static final String BASE_URL = "http://localhost:5173";

    /** Implicit / explicit wait timeout in seconds. */
    protected static final int TIMEOUT_SECONDS = 10;

    /* ------------------------------------------------------------------ */
    /*  Suite-level setup – download ChromeDriver once                    */
    /* ------------------------------------------------------------------ */

    @BeforeSuite
    public void setupDriverBinary() {
        WebDriverManager.chromedriver().setup();
    }

    /* ------------------------------------------------------------------ */
    /*  Per-test setup – fresh browser for every @Test method              */
    /* ------------------------------------------------------------------ */

    @BeforeMethod
    public void setUp() {
        ChromeOptions options = new ChromeOptions();

        // Run headless in CI environments; remove this for local debugging
        if ("true".equalsIgnoreCase(System.getenv("CI"))) {
            options.addArguments("--headless=new");
        }

        options.addArguments("--window-size=1440,900");
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(TIMEOUT_SECONDS));
        wait = new WebDriverWait(driver, Duration.ofSeconds(TIMEOUT_SECONDS));
    }

    /* ------------------------------------------------------------------ */
    /*  Per-test teardown – close the browser                             */
    /* ------------------------------------------------------------------ */

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers available to all test classes                              */
    /* ------------------------------------------------------------------ */

    /** Navigate to a path relative to BASE_URL, e.g. "/login". */
    protected void navigateTo(String path) {
        driver.get(BASE_URL + path);
    }
}
