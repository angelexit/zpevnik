using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Zpevnik;

// ICY support ported from the user's iRMP. Audio is owned by a persistent WebView.
sealed class RadioService : IDisposable
{
    readonly HttpClient http = new() { Timeout = Timeout.InfiniteTimeSpan };
    readonly string path;
    readonly object gate = new();
    JsonArray stations;
    readonly List<object> history = new();
    CancellationTokenSource? cancellation;
    string stationId = "", title = "", status = "Rádio je zastavené.";
    public RadioService(byte[] defaults, string preferences)
    {
        path = preferences;
        stations = JsonNode.Parse(defaults)!.AsArray();
        if (File.Exists(path)) { try { stations = JsonNode.Parse(File.ReadAllText(path))!.AsArray(); } catch { } }
    }
    public object Handle(string action, JsonObject body, bool write)
    {
        lock (gate)
        {
            if (action == "state") return new { stations = stations.DeepClone(), stationId, title, status, history = history.ToArray() };
            if (!write) throw new InvalidOperationException("Použij tlačítko přehrávače.");
            if (action == "stop") { cancellation?.Cancel(); stationId = ""; title = ""; status = "Rádio je zastavené."; return new { ok = true }; }
            if (action == "start")
            {
                var id = body["id"]?.GetValue<string>();
                var station = stations.FirstOrDefault(x => (string?)x?["id"] == id) ?? throw new Exception("Stanice nebyla nalezena.");
                var url = ValidUrl((string?)station["stream_url"]);
                cancellation?.Cancel(); cancellation = new();
                stationId = id!; title = ""; status = "Čekám na ICY metadata…";
                _ = ReadMetadata(url, (string?)station["name"] ?? id!, cancellation.Token);
                return new { url };
            }
            if (action == "add")
            {
                var name = (body["name"]?.GetValue<string>() ?? "").Trim();
                if (name.Length is 0 or > 150) throw new Exception("Zadej název stanice (nejvýše 150 znaků).");
                var url = ValidUrl((string?)body["url"]);
                stations.Add(new JsonObject { ["id"] = Guid.NewGuid().ToString("N"), ["name"] = name, ["stream_url"] = url, ["logo_url"] = "" });
                Save(); return new { ok = true };
            }
            throw new Exception("Neznámá akce rádia.");
        }
    }
    static string ValidUrl(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !string.IsNullOrEmpty(uri.UserInfo))
            throw new Exception("Použij přímou HTTPS adresu zvukového streamu.");
        return uri.AbsoluteUri;
    }
    void Save() { Directory.CreateDirectory(Path.GetDirectoryName(path)!); File.WriteAllText(path, stations.ToJsonString()); }
    public static string ParseTitle(byte[] bytes)
    {
        string text;
        try { text = new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException) { Encoding.RegisterProvider(CodePagesEncodingProvider.Instance); text = Encoding.GetEncoding(1250).GetString(bytes); }
        return Regex.Match(text.TrimEnd('\0'), @"StreamTitle='(.*?)';", RegexOptions.Singleline).Groups[1].Value.Trim();
    }
    async Task ReadMetadata(string url, string name, CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("Icy-MetaData", "1"); request.Headers.UserAgent.ParseAdd("Zpevnik-iRMP/3.1.30");
                using var connect = CancellationTokenSource.CreateLinkedTokenSource(token); connect.CancelAfter(TimeSpan.FromSeconds(20));
                using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, connect.Token);
                response.EnsureSuccessStatusCode();
                if (!response.Headers.TryGetValues("icy-metaint", out var values) || !int.TryParse(values.FirstOrDefault(), out var interval) || interval <= 0 || interval > 16777216)
                { lock (gate) { if (!token.IsCancellationRequested) status = "Stanice neposílá ICY metadata. Zvuk může hrát dál."; } return; }
                using var stream = await response.Content.ReadAsStreamAsync(token);
                var discard = new byte[Math.Min(interval, 65536)]; var length = new byte[1];
                while (!token.IsCancellationRequested)
                {
                    using var readTimeout = CancellationTokenSource.CreateLinkedTokenSource(token); readTimeout.CancelAfter(TimeSpan.FromSeconds(30));
                    for (var remaining = interval; remaining > 0;) { int n = Math.Min(discard.Length, remaining); await stream.ReadExactlyAsync(discard.AsMemory(0, n), readTimeout.Token); remaining -= n; }
                    await stream.ReadExactlyAsync(length, readTimeout.Token);
                    var metadata = new byte[length[0] * 16]; await stream.ReadExactlyAsync(metadata, readTimeout.Token);
                    var next = ParseTitle(metadata);
                    lock (gate)
                    {
                        if (token.IsCancellationRequested) return;
                        status = "ICY metadata připojena.";
                        if (next.Length > 0 && next != title) { title = next; history.Insert(0, new { station = name, title, time = DateTime.Now.ToString("HH:mm") }); if (history.Count > 50) history.RemoveAt(50); }
                    }
                }
            }
            catch (Exception) { lock (gate) { if (!token.IsCancellationRequested) status = "Metadata nejsou dostupná, zkusím připojení znovu."; } }
            try { await Task.Delay(10000, token); } catch (OperationCanceledException) { return; }
        }
    }
    public void Dispose() { cancellation?.Cancel(); http.Dispose(); }
}
