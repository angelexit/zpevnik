using Microsoft.Web.WebView2.WinForms;

namespace Zpevnik;

// Shared by the main window and standalone tool windows.
sealed class FullScreenController
{
    readonly Form window;
    readonly MenuStrip? menu;
    FormWindowState previousState;
    FormBorderStyle previousBorder;
    Rectangle previousBounds;
    Size previousMinimumSize;
    bool previousMenuVisible;
    bool f11Held;
    public bool IsFullScreen { get; private set; }

    public FullScreenController(Form window, WebView2 browser, MenuStrip? menu = null)
    {
        this.window = window;
        this.menu = menu;
        window.KeyPreview = true;
        window.KeyDown += KeyDown;
        window.KeyUp += KeyUp;
        // WebView2 forwards native accelerator keys to these WinForms events,
        // including when focus is in a search field or one of the tool iframes.
        browser.KeyDown += KeyDown;
        browser.KeyUp += KeyUp;
        window.Deactivate += (_, _) => f11Held = false;
    }

    internal void KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Modifiers != Keys.None) return;
        if (e.KeyCode == Keys.F11)
        {
            e.Handled = true;
            // Handled is enough for these non-character keys; keep KeyUp for repeat tracking.
            if (f11Held) return;
            f11Held = true;
            Toggle();
        }
        else if (e.KeyCode == Keys.Escape && IsFullScreen)
        {
            e.Handled = true;
            // Handled is enough for these non-character keys; keep KeyUp for repeat tracking.
            SetFullScreen(false);
        }
    }

    internal void KeyUp(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F11) f11Held = false;
    }

    public void Toggle() => SetFullScreen(!IsFullScreen);

    public void SetFullScreen(bool enabled)
    {
        if (enabled == IsFullScreen) return;
        window.SuspendLayout();
        try
        {
            if (enabled)
            {
                var screenBounds = Screen.FromHandle(window.Handle).Bounds;
                previousState = window.WindowState;
                previousBounds = previousState == FormWindowState.Normal ? window.Bounds : window.RestoreBounds;
                previousBorder = window.FormBorderStyle;
                previousMinimumSize = window.MinimumSize;
                previousMenuVisible = menu?.Visible ?? false;
                if (menu != null) menu.Visible = false;
                window.WindowState = FormWindowState.Normal;
                window.MinimumSize = Size.Empty;
                window.FormBorderStyle = FormBorderStyle.None;
                window.Bounds = screenBounds;
            }
            else
            {
                window.WindowState = FormWindowState.Normal;
                window.FormBorderStyle = previousBorder;
                window.MinimumSize = previousMinimumSize;
                window.Bounds = previousBounds;
                if (menu != null) menu.Visible = previousMenuVisible;
                window.WindowState = previousState;
            }
            IsFullScreen = enabled;
        }
        finally { window.ResumeLayout(true); }
    }
}

