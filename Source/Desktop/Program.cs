using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Zpevnik;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        if(args.Length>=3 && args[0]=="--publisher-test") {
            try {GithubPublisherTests.Run(args[1],args[2]).GetAwaiter().GetResult();}
            catch(Exception ex) {File.WriteAllText(args[1],JsonSerializer.Serialize(new {ok=false,error=ex.ToString()}));}
            return;
        }
        if(args.Length==3 && args[0]=="--discogs-test") {try{DiscogsTests.Run(args[2]).GetAwaiter().GetResult();File.WriteAllText(args[1],"ok");}catch(Exception e){File.WriteAllText(args[1],e.ToString());}return;}
        ApplicationConfiguration.Initialize();
        try { Application.Run(new SongbookWindow(args)); }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Zpěvník – nelze spustit", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}

sealed class SongbookWindow : Form
{
    const string Origin = "https://zpevnik.example";
    readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    readonly Dictionary<string, byte[]> assets = new(StringComparer.Ordinal);
    readonly string dataDirectory;
    LibraryStore store = null!;
    GithubPublisher publisher = null!;
    readonly DiscogsService discogs = new();
    readonly string? webRoot;
    readonly string? testReport;
    readonly string profileDirectory;
    readonly List<string> scriptErrors = new();
    readonly List<string> externalRequests = new();
    CoreWebView2Environment? environment;
    bool testStarted;
    RadioService radio = null!;
    ChordMidi midi = null!;
    Form? radioWindow;
    WebView2? radioBrowser;
    bool radioOpening, quitting;
    readonly FullScreenController fullScreen;

    public SongbookWindow(string[] args)
    {
        Text = "Zpěvník 3.1.30";
        using(var iconStream=Assembly.GetExecutingAssembly().GetManifestResourceStream("app.ico")) Icon=new Icon(iconStream!);
        Width = 1360; Height = 900; MinimumSize = new Size(800, 550);
        testReport = Argument(args, "--smoke-test");
        var requestedWebRoot = Argument(args, "--web-root");
        webRoot = requestedWebRoot == null ? null : Path.GetFullPath(requestedWebRoot, AppContext.BaseDirectory);
        if (webRoot != null) Text += " – vývoj ze zdrojů";
        var settingsFile = Path.Combine(AppContext.BaseDirectory, "settings.json");
        var configuredData = "Data";
        if (File.Exists(settingsFile))
        {
            using var settings = JsonDocument.Parse(File.ReadAllText(settingsFile));
            if (settings.RootElement.TryGetProperty("dataDirectory", out var d)) configuredData = d.GetString() ?? "Data";
        }
        dataDirectory = Path.GetFullPath(Argument(args, "--data-dir") ?? configuredData, AppContext.BaseDirectory);
        profileDirectory = testReport == null
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Zpevnik", "BrowserProfile")
            : Path.Combine(Path.GetDirectoryName(Path.GetFullPath(testReport))!, "test-profile-" + Guid.NewGuid().ToString("N"));
        using var archive = new ZipArchive(Assembly.GetExecutingAssembly().GetManifestResourceStream("web.zip")!);
        foreach (var entry in archive.Entries)
        {
            if (entry.FullName.EndsWith('/')) continue;
            using var stream = entry.Open(); using var buffer = new MemoryStream(); stream.CopyTo(buffer);
            assets[entry.FullName] = buffer.ToArray();
        }
        var menu = new MenuStrip();
        var library = new ToolStripMenuItem("Datová složka");
        library.DropDownItems.Add("Otevřít složku s daty", null, (_, _) =>
        {
            if (Directory.Exists(dataDirectory)) System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(dataDirectory) { UseShellExecute = true });
            else MessageBox.Show("Složka neexistuje: " + dataDirectory);
        });
        library.DropDownItems.Add("Umístění dat", null, (_, _) => MessageBox.Show(dataDirectory + "\n\nJinou složku lze nastavit v settings.json vedle EXE. Potom aplikaci restartuj.", "Data zpěvníku"));
        menu.Items.Add(library);
        menu.Items.Add("Rádio", null, async (_, _) => await OpenRadio());
        FormClosing += (_, _) => { quitting = true; midi?.Dispose(); radio?.Dispose(); radioWindow?.Dispose(); };
        menu.Items.Add("Obnovit", null, (_, _) => browser.Reload());
        Controls.Add(browser); Controls.Add(menu); MainMenuStrip = menu;
        fullScreen = new FullScreenController(this, browser, menu);
        menu.Items.Add("Celá obrazovka (F11)", null, (_, _) => fullScreen.Toggle());
        if (testReport != null) { Opacity = 0; ShowInTaskbar = false; }
        Shown += async (_, _) => await InitializeAsync();
    }

    static string? Argument(string[] args, string key)
    {
        var index = Array.IndexOf(args, key);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }

    async Task InitializeAsync()
    {
        try
        {
            ValidateLibrary();
            store = new LibraryStore(dataDirectory); store.Seed(assets);
            publisher = new GithubPublisher(store,dataDirectory,preferences:testReport==null?null:Path.Combine(profileDirectory,"github-settings.json"),applicationDirectory:testReport==null?AppContext.BaseDirectory:Path.Combine(profileDirectory,"TestProject"));
            if (webRoot != null && !File.Exists(Path.Combine(webRoot, "index.html")))
                throw new FileNotFoundException("Vývojová složka neobsahuje index.html: " + webRoot);
            midi = new ChordMidi(assets,dataDirectory);
            radio = new RadioService(assets["radio/stations.json"], Path.Combine(profileDirectory, "radio-stations.json"));
            environment = await CoreWebView2Environment.CreateAsync(null, profileDirectory);
            await browser.EnsureCoreWebView2Async(environment);
            Configure(browser.CoreWebView2);
            browser.CoreWebView2.WebResourceResponseReceived += (_, e) => {
                if (e.Request.Uri.StartsWith("http") && !e.Request.Uri.StartsWith(Origin + "/")) externalRequests.Add(e.Request.Uri);
            };
            await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.addEventListener('error',e=>chrome.webview.postMessage({kind:'script-error',message:e.message}));window.addEventListener('unhandledrejection',e=>chrome.webview.postMessage({kind:'script-error',message:String(e.reason)}));");
            browser.CoreWebView2.WebMessageReceived += (_, e) =>
            {
                using var msg = JsonDocument.Parse(e.WebMessageAsJson);
                if(Uri.TryCreate(e.Source,UriKind.Absolute,out var source)&&source.GetLeftPart(UriPartial.Authority)==Origin&&msg.RootElement.TryGetProperty("kind",out var controlKind)&&controlKind.GetString()=="window-control") {
                    var action=msg.RootElement.GetProperty("action").GetString();
                    if(action=="minimize")WindowState=FormWindowState.Minimized;
                    else if(action=="fullscreen")fullScreen.Toggle();
                    else if(action=="close")BeginInvoke(new Action(Close));
                    return;
                }

                if (msg.RootElement.TryGetProperty("kind", out var kind) && kind.GetString() == "script-error") scriptErrors.Add(msg.RootElement.GetProperty("message").GetString() ?? "Unknown error");
            };
            browser.CoreWebView2.NavigationCompleted += async (_, e) =>
            {
                if (testReport != null && !testStarted)
                {
                    testStarted = true;
                    try { if (!e.IsSuccess) throw new Exception(e.WebErrorStatus.ToString()); await SmokeTestAsync(); }
                    catch (Exception ex) { WriteTestReport(new { ok = false, error = ex.ToString(), scriptErrors }); }
                    finally { Close(); }
                }
            };
            browser.Source = new Uri(Origin + "/index.html");
        }
        catch (Exception ex)
        {
            var message = ex is WebView2RuntimeNotFoundException
                ? "Chybí Microsoft Edge WebView2 Runtime. Nainstaluj jej z https://developer.microsoft.com/microsoft-edge/webview2/ a spusť aplikaci znovu."
                : ex.Message;
            if (testReport != null) WriteTestReport(new { ok = false, error = message });
            else MessageBox.Show(message, "Zpěvník – nelze spustit", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    void ValidateLibrary()
    {
        foreach (var name in new[] { "database.json", "artists.json" })
        {
            var path = Path.Combine(dataDirectory, name);
            if (!File.Exists(path)) throw new FileNotFoundException("Chybí " + path + "\nRozbal celý ZIP včetně složky Data, nebo oprav dataDirectory v settings.json.");
            using var document = JsonDocument.Parse(File.ReadAllText(path));
            if (document.RootElement.ValueKind != JsonValueKind.Array) throw new InvalidDataException(name + " musí obsahovat pole.");
        }
        var manifestPath = Path.Combine(dataDirectory, "manifest.json");
        if (File.Exists(manifestPath))
        {
            using var manifest = JsonDocument.Parse(File.ReadAllText(manifestPath));
            if (!manifest.RootElement.TryGetProperty("schemaVersion", out var version) || version.GetInt32() != 1)
                throw new InvalidDataException("Nepodporovaná verze datové knihovny. Tato aplikace podporuje schemaVersion 1.");
        }
    }

    void Configure(CoreWebView2 core)
    {
        core.WebMessageReceived += async (_, e) => {
            if (!e.Source.StartsWith(Origin + "/", StringComparison.Ordinal)) return;
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            if(message.RootElement.TryGetProperty("kind",out var kind) && kind.GetString()=="radio-open") await OpenRadio();
        };
        // Responses are served directly from memory/disk. No HTTP server or listening port.
        core.AddWebResourceRequestedFilter(Origin + "/*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += (_, e) => ServeResource(core, e);
        core.NavigationStarting += (_, e) =>
        {
            midi?.Stop();
            var uri = new Uri(e.Uri);
            if (uri.GetLeftPart(UriPartial.Authority) != Origin) e.Cancel = true;
        };
        core.NewWindowRequested += async (_, e) =>
        {
            if (!e.Uri.StartsWith(Origin + "/", StringComparison.Ordinal)) {
                e.Handled = true;
                if(testReport==null && e.IsUserInitiated && Uri.TryCreate(e.Uri,UriKind.Absolute,out var external) && external.Scheme=="https" && new[]{"github.com","www.discogs.com","discogs.com","www.youtube.com","youtube.com","youtu.be"}.Contains(external.Host))
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(external.AbsoluteUri){UseShellExecute=true});
                return;
            }
            using var deferral = e.GetDeferral();
            var child = new Form { Text = "Zpěvník – nástroje", Width = 1100, Height = 800 };
            var childBrowser = new WebView2 { Dock = DockStyle.Fill }; child.Controls.Add(childBrowser);
            _ = new FullScreenController(child, childBrowser);
            try
            {
                await childBrowser.EnsureCoreWebView2Async(environment);
                Configure(childBrowser.CoreWebView2);
                e.NewWindow = childBrowser.CoreWebView2; e.Handled = true; child.Show(this);
            }
            catch (Exception ex) { child.Dispose(); e.Handled = true; MessageBox.Show(ex.Message); }
        };
        core.DownloadStarting += async (_, e) =>
        {
            if (testReport != null) { e.Cancel = true; return; }
            using var deferral = e.GetDeferral();
            e.Handled = true;
            await Task.Yield(); // Leave the WebView callback before opening a modal dialog.
            using var dialog = new SaveFileDialog { FileName = Path.GetFileName(e.ResultFilePath), OverwritePrompt = true };
            if (dialog.ShowDialog(this) == DialogResult.OK) { e.ResultFilePath = dialog.FileName; e.Handled = true; }
            else e.Cancel = true;
        };
    }

    object StopMidi() { midi.Stop();return new {ok=true}; }

    async Task OpenRadio()
    {
        if (environment == null || radioOpening) return;
        if (radioWindow != null) { radioWindow.Show(); radioWindow.WindowState = FormWindowState.Normal; radioWindow.Activate(); return; }
        radioOpening = true;
        try {
            radioWindow = new Form { Text = "Rádio – Zpěvník", Width = 900, Height = 780, MinimumSize = new Size(600, 500) };
            radioBrowser = new WebView2 { Dock = DockStyle.Fill };
            radioWindow.Controls.Add(radioBrowser);
            radioWindow.FormClosing += (_, e) => { if (!quitting && e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; radioWindow.Hide(); } };
            await radioBrowser.EnsureCoreWebView2Async(environment);
            Configure(radioBrowser.CoreWebView2);
            radioBrowser.CoreWebView2.WebMessageReceived += (_, e) => {
                if (!e.Source.StartsWith(Origin + "/radio/",StringComparison.Ordinal)) return;
                using var message = JsonDocument.Parse(e.WebMessageAsJson);
                if(message.RootElement.TryGetProperty("kind",out var kind) && kind.GetString()=="radio-hide") radioWindow.Hide();
            };
            radioBrowser.Source = new Uri(Origin + "/radio/index.html");
            if (testReport != null) { radioWindow.Opacity = 0; radioWindow.ShowInTaskbar = false; }
            radioWindow.Show(this);
        } catch(Exception ex) { radioWindow?.Dispose(); radioWindow=null; if(testReport!=null)throw; MessageBox.Show(ex.Message,"Rádio"); }
        finally { radioOpening = false; }
    }

    async void ServeResource(CoreWebView2 core, CoreWebView2WebResourceRequestedEventArgs e)
    {
        using var deferral = e.GetDeferral();
        try
        {
            var uri = new Uri(e.Request.Uri);
            var relative = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            if (relative.StartsWith("api/"))
            {
                var write=e.Request.Method=="POST";
                if(!write && e.Request.Method!="GET") throw new UnauthorizedAccessException();
                if(write && e.Request.Headers.GetHeader("Origin") != Origin) throw new UnauthorizedAccessException();
                var body=new System.Text.Json.Nodes.JsonObject();
                if(write) { using var reader=new StreamReader(e.Request.Content,Encoding.UTF8);var text=reader.ReadToEnd();if(text.Length>22000000) throw new Exception("Požadavek je příliš velký.");body=System.Text.Json.Nodes.JsonNode.Parse(text)!.AsObject(); }
                else foreach(var part in uri.Query.TrimStart('?').Split('&',StringSplitOptions.RemoveEmptyEntries)) { var kv=part.Split('=',2);body[Uri.UnescapeDataString(kv[0])]=kv.Length>1?Uri.UnescapeDataString(kv[1]):""; }
                try { var result=relative=="api/midi/play" && write ? midi.Play((string?)body["chord"] ?? "",testReport!=null) : relative=="api/midi/stop" && write ? StopMidi() : relative.StartsWith("api/radio/") ? radio.Handle(relative[10..],body,write) : relative.StartsWith("api/discogs/") ? await discogs.Handle(relative[12..],body,write) : relative.StartsWith("api/github/") ? await publisher.Handle(relative[11..],body,write) : store.Handle(relative[4..],body,write);e.Response=core.Environment.CreateWebResourceResponse(new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(result)),200,"OK","Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store"); }
                catch(Exception ex) { e.Response=core.Environment.CreateWebResourceResponse(new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(new {error=ex.Message})),409,"Conflict","Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store"); }
                return;
            }
            byte[]? bytes = null;
            if (relative.StartsWith("data/", StringComparison.Ordinal))
            {
                var libraryPath = relative[5..];
                if (libraryPath.Split('/', '\\').Any(x => x == "..") || libraryPath.Contains(':')) throw new UnauthorizedAccessException();
                var file = Path.GetFullPath(Path.Combine(dataDirectory, libraryPath.Replace('/', Path.DirectorySeparatorChar)));
                if (!file.StartsWith(dataDirectory.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new UnauthorizedAccessException();
                if (File.Exists(file)) bytes = File.ReadAllBytes(file);
            }
            else if (webRoot != null)
            {
                var resourcePath = relative.Length == 0 ? "index.html" : relative;
                if (resourcePath.Split('/', '\\').Any(x => x == "..") || resourcePath.Contains(':')) throw new UnauthorizedAccessException();
                var file = Path.GetFullPath(Path.Combine(webRoot, resourcePath.Replace('/', Path.DirectorySeparatorChar)));
                if (!file.StartsWith(webRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new UnauthorizedAccessException();
                if (File.Exists(file)) bytes = File.ReadAllBytes(file);
            }
            else assets.TryGetValue(relative.Length == 0 ? "index.html" : relative, out bytes);
            if (e.Request.Method != "GET" && e.Request.Method != "HEAD")
                e.Response = core.Environment.CreateWebResourceResponse(null, 405, "Method Not Allowed", "Allow: GET, HEAD");
            else if (bytes == null)
                e.Response = core.Environment.CreateWebResourceResponse(new MemoryStream(Encoding.UTF8.GetBytes("Soubor nenalezen")), 404, "Not Found", "Content-Type: text/plain; charset=utf-8");
            else
                e.Response = core.Environment.CreateWebResourceResponse(new MemoryStream(e.Request.Method == "HEAD" ? Array.Empty<byte>() : bytes), 200, "OK", "Content-Type: " + Mime(relative) + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
        }
        catch (Exception)
        {
            e.Response = core.Environment.CreateWebResourceResponse(null, 403, "Forbidden", "Content-Type: text/plain");
        }
    }

    static string Mime(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8", ".js" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8", ".json" => "application/json; charset=utf-8",
        ".jpg" or ".jpeg" => "image/jpeg", ".png" => "image/png", ".svg" => "image/svg+xml",
        ".woff2" => "font/woff2", ".woff" => "font/woff", ".ttf" => "font/ttf", _ => "application/octet-stream"
    };

    async Task<string> Evaluate(string js) => await browser.CoreWebView2.ExecuteScriptAsync(js);
    async Task WaitFor(string expression)
    {
        for (var i = 0; i < 120; i++)
        {
            if (await Evaluate("Boolean(" + expression + ")") == "true") return;
            await Task.Delay(100);
        }
        throw new TimeoutException(expression);
    }
    void WriteTestReport(object report) => File.WriteAllText(testReport!, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }), Encoding.UTF8);

    void TestFullScreen()
    {
        var initialState = WindowState;
        var initialBounds = Bounds;
        var initialBorder = FormBorderStyle;
        var targetScreen = Screen.FromHandle(Handle).Bounds;
        // Raise the same managed events that WebView2 exposes for native key presses.
        void Key(Keys key, bool up = false)
        {
            typeof(Control).GetMethod(up ? "OnKeyUp" : "OnKeyDown", BindingFlags.Instance | BindingFlags.NonPublic)!
                .Invoke(browser, new object[] { new KeyEventArgs(key) });
        }
        Key(Keys.F11);
        if (!fullScreen.IsFullScreen || FormBorderStyle != FormBorderStyle.None || Bounds != targetScreen || MainMenuStrip!.Visible)
            throw new Exception("F11 did not enter borderless full-screen.");
        Key(Keys.F11); // Auto-repeat must not toggle back.
        if (!fullScreen.IsFullScreen) throw new Exception("F11 auto-repeat toggled full-screen.");
        Key(Keys.F11, true);
        Key(Keys.F11); Key(Keys.F11, true);
        if (fullScreen.IsFullScreen || Bounds != initialBounds || WindowState != initialState || FormBorderStyle != initialBorder || !MainMenuStrip.Visible)
            throw new Exception("F11 did not restore the previous window.");
        WindowState = FormWindowState.Maximized;
        Key(Keys.F11); Key(Keys.F11, true);
        Key(Keys.Escape);
        if (fullScreen.IsFullScreen || WindowState != FormWindowState.Maximized || !MainMenuStrip.Visible)
            throw new Exception("Escape did not restore maximized window.");
        Key(Keys.Control | Keys.F11); Key(Keys.F11, true);
        if (fullScreen.IsFullScreen) throw new Exception("Modified shortcut unexpectedly toggled full-screen.");
        WindowState = initialState; Bounds = initialBounds;
    }

    async Task TestRadio()
    {
        if (RadioService.ParseTitle(Encoding.UTF8.GetBytes("StreamTitle='Jiří – Píseň';\0")) != "Jiří – Píseň") throw new Exception("ICY parser");
        await OpenRadio();
        var core = radioBrowser!.CoreWebView2;
        for(int i=0;i<100;i++) { if(await core.ExecuteScriptAsync("document.querySelectorAll('#stations option').length===8") == "true") break; await Task.Delay(100); }
        if(await core.ExecuteScriptAsync("document.querySelectorAll('#stations option').length===8")!="true")throw new Exception("Radio stations");
        await core.ExecuteScriptAsync("window.radioTest='running';(async()=>{try{const b=new ArrayBuffer(8044),v=new DataView(b);const txt=(p,s)=>[...s].forEach((c,i)=>v.setUint8(p+i,c.charCodeAt(0)));txt(0,'RIFF');v.setUint32(4,8036,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);txt(36,'data');v.setUint32(40,8000,true);new Uint8Array(b,44).fill(128);const a=document.getElementById('audio');a.src=URL.createObjectURL(new Blob([b],{type:'audio/wav'}));a.muted=true;a.loop=true;await a.play();window.radioTest='ok';}catch(e){window.radioTest=String(e)}})()");
        for(int i=0;i<100;i++) { if(await core.ExecuteScriptAsync("window.radioTest!=='running'")=="true")break;await Task.Delay(100); }
        if(await core.ExecuteScriptAsync("window.radioTest==='ok'")!="true")throw new Exception("Radio playback: "+await core.ExecuteScriptAsync("window.radioTest"));
        radioWindow!.Close();
        if(radioWindow.IsDisposed)throw new Exception("Radio close disposed player");
        await Task.Delay(1000);
        if(await core.ExecuteScriptAsync("!document.getElementById('audio').paused")!="true")throw new Exception("Radio background playback");
        using var shot = File.Create(Path.ChangeExtension(testReport!, ".radio.png"));
        await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,shot);
    }

    async Task TestNativeChordClick()
    {
        await Evaluate("openTool('editor');window.__nativeReady=false;(async()=>{const w=document.getElementById('editorFrame').contentWindow;await w.eval(`(async()=>{const {mountChordText}=await import('/js/tools/editor/chord-text.js');const box=document.createElement('div');box.id='native-move-test';box.style.cssText='position:fixed;left:20px;top:80px;width:600px;z-index:999999;background:white;color:black';document.body.append(box);for(const value of ['[C]Sloka','Jsem tady']){const t=document.createElement('textarea');t.value=value;box.append(t);mountChordText(t);}})()`);window.__nativeReady=true;})()");
        await WaitFor("window.__nativeReady");
        async Task Click(string position) {
            var coordinates=await Evaluate("(()=>{const f=document.getElementById('editorFrame'),d=f.contentDocument,box=d.getElementById('native-move-test');"+position+"const fr=f.getBoundingClientRect();return {x:fr.x+r.x+1,y:fr.y+r.y+r.height/2};})()");
            using var point=JsonDocument.Parse(coordinates);var x=point.RootElement.GetProperty("x").GetDouble();var y=point.RootElement.GetProperty("y").GetDouble();
            foreach(var type in new[]{"mouseMoved","mousePressed","mouseReleased"}) await browser.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchMouseEvent",JsonSerializer.Serialize(new {type,x,y,button=type=="mouseMoved"?"none":"left",clickCount=type=="mouseMoved"?0:1}));
        }
        await Click("const r=box.querySelector('.inline-chord').getBoundingClientRect();");
        if(await Evaluate("!!document.getElementById('editorFrame').contentDocument.querySelector('.floating-chord')")!="true")throw new Exception("Real pointer failed to lift chord");
        await Click("const range=d.createRange();range.setStart(box.querySelectorAll('.chord-text')[1].firstChild,5);range.collapse(true);const r=range.getBoundingClientRect();");
        if(await Evaluate("(()=>{const t=document.getElementById('editorFrame').contentDocument.querySelectorAll('#native-move-test textarea');return t[0].value==='Sloka' && t[1].value==='Jsem [C]tady';})()")!="true")throw new Exception("Real pointer failed to place chord");
        await Evaluate("document.getElementById('editorFrame').contentDocument.getElementById('native-move-test').remove()");
    }

    async Task SmokeTestAsync()
    {
        if(!File.Exists(Path.Combine(dataDirectory,".integration-test-library"))) throw new Exception("Write tests require an isolated library marked .integration-test-library");
        TestFullScreen();
        await TestRadio();
        foreach(var chord in new[]{"C","F#","C#mi","H","B","Ami"}) {
            using var check=JsonDocument.Parse(JsonSerializer.Serialize(midi.Play(chord,true)));
            if(!check.RootElement.GetProperty("ok").GetBoolean())throw new Exception("MIDI open failed: "+chord);
        }
        if(ChordMidi.FileName("../evil")!=null || ChordMidi.FileName("C/H")!=null)throw new Exception("MIDI unsupported names");
        await WaitFor("document.querySelector('.artist-card') || document.querySelector('[onclick*=artist]')");
        await Evaluate("window.__audit=null;(async()=>{try{const db=await(await fetch('/data/database.json')).json();const {renderSongDetail}=await import('/js/render/ui.js');let count=0;for(const row of db){await renderSongDetail(row.file,document.getElementById('app-content'));if(!document.querySelector('.song-section-card'))throw new Error(row.file);count++;}const {getChordDiagram}=await import('/js/render/chords.js');if(!getChordDiagram('C','guitar','standard').includes('svg'))throw new Error('Chord SVG');window.__audit={ok:true,count};}catch(e){window.__audit={ok:false,error:String(e)}}})();");
        await WaitFor("window.__audit !== null");
        using(var tests=new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream("performance-tests.js")!)) await Evaluate(await tests.ReadToEndAsync());
        await WaitFor("window.__performanceTest !== null");
        var performanceTests=await Evaluate("window.__performanceTest");
        if(await Evaluate("window.__performanceTest.ok")!="true") throw new Exception(performanceTests);
        var allSongs = await Evaluate("window.__audit");
        if (await Evaluate("window.__audit.ok") != "true") throw new Exception(allSongs);
        await Evaluate("history.replaceState({},'', '/index.html');dispatchEvent(new Event('popstate'));");
        await WaitFor("document.querySelector('[onclick*=artist]')");
        var startup = await Evaluate("JSON.stringify({title:document.title,artists:document.querySelectorAll('[onclick*=artist]').length,secure:isSecureContext,directoryPicker:typeof showDirectoryPicker})");
        await Evaluate("document.getElementById('adminNameInput').value='admin';document.getElementById('adminPassInput').value='admin';document.getElementById('adminLoginBtn').click();");
        await Evaluate("document.querySelector('[onclick*=artist]').click()");
        await WaitFor("document.querySelector('[onclick*=song]')");
        await Evaluate("document.querySelector('[onclick*=song]').click()");
        await WaitFor("document.querySelector('#songContent .song-section-card')");
        if (await Evaluate("document.getElementById('fullscreenBtn') === null") != "true")
            throw new Exception("Obsolete song fullscreen button is still present.");
        var song = await Evaluate("JSON.stringify({title:document.title,sections:document.querySelectorAll('.song-section-card').length,settings:!!document.getElementById('instrumentSelect')})");
        await Evaluate("window.__soundTest=null;(async()=>{try{const real=window.fetch;const calls=[];window.fetch=async(u,o)=>String(u).includes('/api/midi/')?(calls.push(JSON.parse(o.body||'{}').chord||'stop'),new Response(JSON.stringify({ok:true}),{status:200})):real(u,o);try{const {scheduleChordSound,stopChordSound}=await import('/js/chords/sound.js');localStorage.removeItem('chordSound');const el=document.querySelector('[data-original]'),tip=document.createElement('div');tip.className='visible';scheduleChordSound('C',el,tip);await new Promise(r=>setTimeout(r,250));stopChordSound();await new Promise(r=>setTimeout(r,1050));if(calls.includes('C'))throw Error('Cancelled MIDI played');scheduleChordSound('H',el,tip);await new Promise(r=>setTimeout(r,1150));if(calls.filter(x=>x==='H').length!==1)throw Error('Delayed MIDI');stopChordSound();const f=document.getElementById('chordFrames'),sf=document.getElementById('secondChordFrames'),sc=document.getElementById('secondChordColorSelect');f.value='true';f.onchange();sf.value='false';sf.onchange();sc.value='#dc2626';sc.onchange();if(!document.body.classList.contains('chord-frames-enabled')||document.body.classList.contains('second-chord-frames-enabled')||document.getElementById('songContent').style.getPropertyValue('--song-second-chord-color')!=='#dc2626')throw Error('Independent chord styles');window.__soundTest=true;}finally{window.fetch=real;}}catch(e){window.__soundTest=String(e)}})()");
        await WaitFor("window.__soundTest !== null");
        if(await Evaluate("window.__soundTest")!="true")throw new Exception(await Evaluate("window.__soundTest"));
        await WaitFor("document.fonts.status === 'loaded'");
        await Task.Delay(1200);
        using (var shot = File.Create(Path.ChangeExtension(testReport!, ".png")))
            await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, shot);
        await Evaluate("history.back()");
        await WaitFor("document.querySelector('[onclick*=song]')");
        await Evaluate("window.__galleryResult=null;(async()=>{const {renderChordGallery}=await import('/js/chords/gallery.js');const h=document.createElement('div');document.body.append(h);await renderChordGallery(h);if(h.querySelectorAll('.chord-gallery-card').length!==26||h.querySelectorAll('section').length!==5)throw Error('Gallery groups');h.querySelector('select').value='H';h.querySelector('select').dispatchEvent(new Event('change'));if(h.querySelector('h3').textContent!=='H')throw Error('Gallery root');h.querySelector('#galleryRoot').value='C';for(const inst of ['ukulele','mandolin','banjo','bass','piano','guitar']){const sel=h.querySelector('#galleryInstrument');sel.value=inst;sel.dispatchEvent(new Event('change'));for(let i=0;i<100&&h.querySelector('[data-loading=true]');i++)await new Promise(r=>setTimeout(r,50));if(h.querySelector('[data-loading=true]')||h.querySelectorAll('.chord-gallery-card').length!==26)throw Error('Instrument '+inst);if(['ukulele','mandolin','banjo','guitar'].includes(inst)&&!h.querySelector('[data-instrument='+inst+']'))throw Error('Instrument diagram '+inst);}const sel=h.querySelector('#galleryInstrument');sel.value='ukulele';sel.dispatchEvent(new Event('change'));while(h.querySelector('[data-loading=true]'))await new Promise(r=>setTimeout(r,50));const tuning=h.querySelector('#galleryTuning');tuning.value='baritone';tuning.dispatchEvent(new Event('change'));while(h.querySelector('[data-loading=true]'))await new Promise(r=>setTimeout(r,50));if(!h.querySelector('[data-tuning=baritone]'))throw Error('Baritone diagram');h.remove();const {applyMode}=await import('/js/app/login.js');applyMode('user');if([...document.querySelectorAll('[data-admin-only]')].some(x=>!x.hidden)||document.getElementById('toolsBtn').style.display==='none')throw Error('User menu');applyMode('admin');if([...document.querySelectorAll('[data-admin-only]')].some(x=>x.hidden))throw Error('Admin menu');if(document.querySelectorAll('.window-controls button').length!==3)throw Error('Window controls');localStorage.setItem('zpevnikMode','admin');return true;})().then(v=>window.__galleryResult=v).catch(e=>window.__galleryResult=String(e));");
        await WaitFor("window.__galleryResult !== null");
        var galleryTest=await Evaluate("window.__galleryResult");
        if(galleryTest!="true")throw new Exception("Gallery/menu test failed: "+galleryTest);
        await Evaluate("location.href='tools/index.html#export'");
        await WaitFor("document.querySelector('iframe') && document.querySelector('iframe').contentDocument?.readyState === 'complete'");
        await Task.Delay(700);
        var tools = await Evaluate("JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({src:f.getAttribute('src'),ready:f.contentDocument.readyState,hasBody:!!f.contentDocument.body,secure:f.contentWindow.isSecureContext,picker:typeof f.contentWindow.showDirectoryPicker})))");
        await Evaluate("window.__editorTest=null;(async()=>{try{const song=await(await fetch('/data/songs/4_non_blondes-whats_up.json')).json();const editor=document.getElementById('editorFrame').contentWindow;editor.loadSongObject(song);const rebuilt=editor.buildSongObject();if(rebuilt.title!==song.title||rebuilt.parts.length!==song.parts.length)throw new Error('Editor roundtrip');const chords=document.getElementById('chordsFrame').contentWindow;if(!chords.document.querySelector('#svg-render svg'))throw new Error('Chord editor SVG');window.__editorTest={ok:true,title:rebuilt.title,parts:rebuilt.parts.length};}catch(e){window.__editorTest={ok:false,error:String(e)}}})();");
        await WaitFor("window.__editorTest !== null");
        var editorTest = await Evaluate("window.__editorTest");
        if (await Evaluate("window.__editorTest.ok") != "true") throw new Exception(editorTest);
        using (var tests = new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream("module-tests.js")!))
            await Evaluate(await tests.ReadToEndAsync());
        await WaitFor("window.__moduleTest !== null");
        var moduleTests = await Evaluate("window.__moduleTest");
        if (await Evaluate("window.__moduleTest.ok") != "true") throw new Exception(moduleTests);
        await TestNativeChordClick();
        foreach(var tool in new[]{"editor","chords","export"}) {
            await Evaluate("openTool('"+tool+"');");
            if(tool=="editor") await Evaluate("const panel=document.getElementById('editorFrame').contentDocument.getElementById('discogsPanel');panel.open=true;panel.scrollIntoView();");
            if(tool=="chords") await Evaluate("document.getElementById('chordsFrame').contentDocument.querySelector('.neck-scroll').scrollIntoView({block:'center'});");
            await Task.Delay(500);
            using var shot=File.Create(Path.ChangeExtension(testReport!, tool+".png"));
            await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,shot);
        }
        await Evaluate("reloadActiveTool(); toggleToolsTheme();");
        await Task.Delay(500);
        await Evaluate("location.href='/index.html?chords';");
        await WaitFor("document.querySelectorAll('.chord-gallery-card').length === 26");
        await Task.Delay(500);
        using(var shot=File.Create(Path.ChangeExtension(testReport!, "gallery.png")))
            await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,shot);
        if (scriptErrors.Count != 0) throw new Exception(string.Join("\n", scriptErrors));
        if (externalRequests.Count != 0) throw new Exception("Unexpected network requests: " + string.Join(", ", externalRequests));
        if(await radioBrowser!.CoreWebView2.ExecuteScriptAsync("!document.getElementById('audio').paused")!="true")throw new Exception("Radio stopped during songbook navigation");
        WriteTestReport(new { ok = true, radioBackground = true, fullScreenTransitions = true, allSongs, startup, song, tools, editorTest, moduleTests, performanceTests, scriptErrors, externalRequests, dataDirectory, webRoot });
    }
}

