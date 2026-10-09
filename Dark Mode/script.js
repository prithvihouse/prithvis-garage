/*
    PRITHVI'S GARAGE
    Light / Dark Theme Switcher (Vanilla JavaScript)

    HOW IT WORKS
    - styles.css defines all theme colors as CSS variables.
    - The "data-theme" attribute on the <html> element decides which set
      of variables is active ("light" or "dark").
    - This file flips that attribute when the toggle button is clicked.
    - The chosen theme is saved in localStorage so it is remembered when
      the page is reloaded and when moving between pages.

    Approach based on the "dark theme in 5 minutes with vanilla JS" tutorial
    on dev.to: toggle a theme setting, save it, and retrieve it on page load.
*/

/* Key name used to store the theme choice in the browser. */
var THEME_KEY = 'garage-theme';

/* The <html> element. The theme attribute is placed here. */
var root = document.documentElement;

/*
    Read the saved theme from localStorage.
    The try/catch keeps the page working if storage is blocked
    (for example, in some private browsing modes).
*/
function getSavedTheme() {
    try {
        return localStorage.getItem(THEME_KEY);
    } catch (error) {
        return null;
    }
}

/* Save the chosen theme in localStorage. */
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        /* If saving fails, the theme still works for this page view. */
    }
}

/*
    Apply a theme to the page.
    Sets the data-theme attribute and updates the toggle button text
    (if the button exists on the page yet).
*/
function applyTheme(theme) {
    root.setAttribute('data-theme', theme);

    var button = document.getElementById('theme-toggle');
    if (button) {
        if (theme === 'dark') {
            button.textContent = 'Switch to Light Theme';
            button.setAttribute('aria-pressed', 'true');
        } else {
            button.textContent = 'Switch to Dark Theme';
            button.setAttribute('aria-pressed', 'false');
        }
    }
}

/* Switch to the opposite theme, then save the new choice. */
function toggleTheme() {
    var current = root.getAttribute('data-theme');
    var next = (current === 'dark') ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
}

/*
    Run right away (this file is loaded in the <head>) so the saved theme
    is applied before the page is drawn. This avoids a flash of the light
    theme when a visitor has chosen dark. Light is the default.
*/
applyTheme(getSavedTheme() === 'dark' ? 'dark' : 'light');

/*
    Once the page has loaded, the toggle button exists.
    Sync its text to the current theme and listen for clicks.
*/
document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');

    applyTheme(root.getAttribute('data-theme'));

    if (button) {
        button.addEventListener('click', toggleTheme);
    }
});

/*
    Keep multiple open tabs in sync: if the theme is changed in one tab,
    the "storage" event lets the other tabs update too.
*/
window.addEventListener('storage', function (event) {
    if (event.key === THEME_KEY) {
        applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
    }
});
