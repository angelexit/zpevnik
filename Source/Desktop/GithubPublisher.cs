using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
namespace Zpevnik;

// Only data files are publishable. Credentials never enter the library or manifest.
sealed class GithubPublisher
{
    readonly LibraryStore store;
    readonly LibraryStore projectStore;
    readonly string projectDirectory;
    bool project;
    LibraryStore ActiveStore=>project?projectStore:store;
    Dictionary<string,byte[]> Snapshot()=>project?projectStore.ProjectSnapshot():store.PublishSnapshot();
    readonly string settingsPath;
    readonly HttpClient http;
    JsonObject settings = new();
    string token = "";
    string TokenPath=>settingsPath+".token";
    volatile string progress = "";
    readonly Dictionary<string,byte[]> blobCache=new(StringComparer.Ordinal);
    long cacheBytes;
    readonly bool throttle;
    DateTime nextWrite = DateTime.MinValue;
    Plan? plan;
    readonly SemaphoreSlim gate = new(1,1);
    sealed record Plan(string Id, string Head, string Tree, Dictionary<string,byte[]> Local, Dictionary<string,byte[]> RemoteFiles, Dictionary<string,string> Remote, JsonObject Baseline, List<SyncComparison.Entry> Entries, List<string> Warnings);
    string StateKey=>Hash(Encoding.UTF8.GetBytes(S(settings,"owner").ToLowerInvariant()+"/"+S(settings,"repo").ToLowerInvariant()+"\n"+S(settings,"branch")+"\n"+(project?"/@Source+Licenses":S(settings,"folder"))));
    public GithubPublisher(LibraryStore library, string directory, HttpMessageHandler? handler = null, string? preferences = null, string? applicationDirectory = null)
    {
        store=library;throttle=handler==null;
        projectDirectory=Path.GetFullPath(applicationDirectory??AppContext.BaseDirectory);projectStore=new LibraryStore(projectDirectory);
        settingsPath=preferences ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Zpevnik","Github",Hash(Encoding.UTF8.GetBytes(Path.GetFullPath(directory).ToUpperInvariant()))+".json");
        if(File.Exists(settingsPath)) settings=JsonNode.Parse(File.ReadAllText(settingsPath))?.AsObject() ?? new();
        try{if(File.Exists(TokenPath))token=Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(TokenPath),null,DataProtectionScope.CurrentUser));}catch{token="";}
        http=handler==null?new HttpClient(new HttpClientHandler{AllowAutoRedirect=false}):new HttpClient(handler);
        http.Timeout=TimeSpan.FromSeconds(90);
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Zpevnik/3.1.30");
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        http.DefaultRequestHeaders.Add("X-GitHub-Api-Version","2026-03-10");
    }
    static string S(JsonNode? n,string key)=>n?[key]?.GetValue<string>()??"";
    static byte[] Bytes(JsonNode n)=>Encoding.UTF8.GetBytes(n.ToJsonString(new JsonSerializerOptions{WriteIndented=true, Encoder=System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All)}));
    static string Hash(byte[] b)=>Convert.ToHexString(SHA256.HashData(b)).ToLowerInvariant();
    internal static string BlobHash(byte[] b)=>Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes("blob "+b.Length+"\0").Concat(b).ToArray())).ToLowerInvariant();
    internal static bool Managed(string p)=>p is "database.json" or "artists.json" or "config.json" or "manifest.json" || Regex.IsMatch(p,@"^(songs|chords)/[^/]+\.json$") || Regex.IsMatch(p,@"^img/(covers|interprets)/[^/]+\.(jpg|jpeg|png|webp)$",RegexOptions.IgnoreCase);
    static void SafePath(string p) { if(p.Contains('\\')||p.Contains(':')||p.Split('/').Any(s=>s is "" or "." or ".."||s.Any(char.IsControl))) throw new Exception("Neplatná cesta souboru."); }
    string Prefix=>project||S(settings,"folder")==""?"":S(settings,"folder")+"/";
    string Repo=>"repos/"+Uri.EscapeDataString(S(settings,"owner"))+"/"+Uri.EscapeDataString(S(settings,"repo"));
    string Branch=>string.Join('/',S(settings,"branch").Split('/').Select(Uri.EscapeDataString));
    void Validate()
    {
        foreach(var key in new[]{"owner","repo"}) if(!Regex.IsMatch(S(settings,key),@"^[A-Za-z0-9_.-]+$")||S(settings,key) is "." or "..") throw new Exception("Vyplň vlastníka a název repozitáře (bez URL).");
        var branch=S(settings,"branch");if(branch==""||branch.Contains("..")||branch.Any(char.IsControl)) throw new Exception("Vyplň platnou větev.");
        if(S(settings,"folder")!="")SafePath(S(settings,"folder"));
    }
    async Task<JsonNode> Api(string method,string path,JsonNode? body=null)
    {
        if(method!="GET" && throttle) {
            var delay=nextWrite-DateTime.UtcNow;if(delay>TimeSpan.Zero)await Task.Delay(delay);
            nextWrite=DateTime.UtcNow.AddSeconds(1.1);
        }
        using var request=new HttpRequestMessage(new HttpMethod(method),"https://api.github.com/"+Repo+"/"+path);
        if(token!="")request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",token);
        if(body!=null)request.Content=new StringContent(body.ToJsonString(),Encoding.UTF8,"application/json");
        using var response=await http.SendAsync(request);
        if(!response.IsSuccessStatusCode) throw new Exception($"GitHub: {(int)response.StatusCode}. "+((int)response.StatusCode switch {401=>"Token není platný.",403=>"Ověř oprávnění Contents, ochranu větve nebo limit požadavků.",404=>"Repozitář či větev neexistuje, nebo k němu nemáš přístup. Nový repozitář nejprve založ s README.",409 or 422=>"Větev se změnila nebo zápis odmítla její pravidla. Znovu zkontroluj změny.",_=>"Požadavek se nezdařil. Znovu zkontroluj stav před dalším publikováním."}));
        return JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
    }
    public async Task<object> Handle(string action,JsonObject body,bool write)
    {
        if(action=="status"&&!write)return new {progress};
        if(!await gate.WaitAsync(0))throw new Exception("Probíhá jiná operace s GitHubem.");
        try {
            if(action=="settings"&&!write)return new { settings=settings.DeepClone(),hasToken=token!="",projectDirectory };
            if(action=="settings"&&write){
                var next=new JsonObject();foreach(var k in new[]{"owner","repo","branch","folder"})next[k]=S(body,k).Trim();
                next["checkOnOpen"]=body["checkOnOpen"]?.GetValue<bool>()??true;
                var old=settings;settings=next;try{Validate();}catch{settings=old;throw;}
                if(body.ContainsKey("token")&&S(body,"token")!="")token=S(body,"token").Trim();
                if(body["forgetToken"]?.GetValue<bool>()==true)token="";
                Directory.CreateDirectory(Path.GetDirectoryName(settingsPath)!);
                if(token!="")File.WriteAllBytes(TokenPath,ProtectedData.Protect(Encoding.UTF8.GetBytes(token),null,DataProtectionScope.CurrentUser));
                else if(File.Exists(TokenPath))File.Delete(TokenPath);
                Directory.CreateDirectory(Path.GetDirectoryName(settingsPath)!);File.WriteAllBytes(settingsPath,Bytes(settings));plan=null;
                return new {settings=settings.DeepClone(),hasToken=token!="",projectDirectory};
            }
            if(!write)throw new Exception("Nepodporovaná operace.");Validate();
            if(action=="check"){project=S(body,"scope")=="project";return await Check();}
            if(action=="preview")return Preview(body);
            if(action=="publish"||action=="download")return await Synchronize(body,action=="publish");
            throw new Exception("Nepodporovaná operace.");
        } catch(HttpRequestException){throw new Exception("GitHub není dostupný. Ověř připojení a znovu zkontroluj změny.");}
        catch(TaskCanceledException){throw new Exception("GitHub neodpověděl včas. Znovu zkontroluj stav; publikování mohlo být dokončeno.");}
        finally {gate.Release();}
    }
    async Task<object> Check()
    {
        plan=null;progress=project?"Čtu Source a Licenses…":"Čtu místní datovou složku…";
        var local=await Task.Run(Snapshot);
        var baseline=ActiveStore.ReadSyncState(StateKey);
        var head=S((await Api("GET","git/ref/heads/"+Branch))["object"],"sha");
        var tree=S((await Api("GET","git/commits/"+head))["tree"],"sha");
        var remoteTree=await Api("GET","git/trees/"+tree+"?recursive=1");
        if(remoteTree["truncated"]?.GetValue<bool>()==true)throw new Exception("Repozitář je příliš velký pro úplnou kontrolu. Použij samostatný repozitář databáze.");
        var remote=new Dictionary<string,string>(StringComparer.Ordinal);var files=new Dictionary<string,byte[]>(StringComparer.Ordinal);long total=0;var names=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var checkedFiles=0;
        var expectedFiles=remoteTree["tree"]!.AsArray().Count(item=>{var p=S(item,"path");return p.StartsWith(Prefix,StringComparison.Ordinal)&&(project?ProjectFiles.Managed(p[Prefix.Length..]):Managed(p[Prefix.Length..]));});
        foreach(var item in remoteTree["tree"]!.AsArray()){
            var path=S(item,"path");if(!path.StartsWith(Prefix,StringComparison.Ordinal))continue;path=path[Prefix.Length..];if(!(project?ProjectFiles.Managed(path):Managed(path)))continue;SafePath(path);
            if(!names.Add(path))throw new Exception("Názvy souborů se liší jen velikostí písmen: "+path);
            if(path.IndexOfAny(new[]{'<','>','|','*','?'})>=0||Regex.IsMatch(Path.GetFileNameWithoutExtension(path),@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$",RegexOptions.IgnoreCase))throw new Exception("Soubor nelze uložit ve Windows: "+path);
            if(S(item,"type")!="blob"||S(item,"mode") is "120000" or "160000")throw new Exception("Databáze na GitHubu obsahuje odkaz místo souboru: "+path);
            if((item?["size"]?.GetValue<long>()??0)>10000000)throw new Exception("Soubor je větší než 10 MB: "+path);
            progress="Kontroluji GitHub: "+(++checkedFiles)+" / "+expectedFiles+" — "+path;
            remote[path]=S(item,"sha");
            byte[] b;
            if(local.TryGetValue(path,out var candidate)&&BlobHash(candidate)==remote[path])b=candidate;
            else if(blobCache.TryGetValue(remote[path],out var cached))b=cached;
            else {var blob=await Api("GET","git/blobs/"+remote[path]);if(S(blob,"encoding")!="base64")throw new Exception("Nepodporovaný obsah: "+path);b=Convert.FromBase64String(S(blob,"content"));if(BlobHash(b)!=remote[path])throw new Exception("Kontrolní součet nesouhlasí: "+path);}
            if(!blobCache.ContainsKey(remote[path])){if(cacheBytes+b.Length>100000000){blobCache.Clear();cacheBytes=0;}blobCache[remote[path]]=b;cacheBytes+=b.Length;}
            total+=b.Length;if(total>100000000||remote.Count>10000)throw new Exception("Databáze je příliš velká (limit 100 MB / 10 000 souborů).");files[path]=b;
        }
        var entries=SyncComparison.Compare(SyncComparison.Normalize(local),SyncComparison.Normalize(files),baseline);
        var warnings=new List<string>();
        if(!project){var diagnostic=new Dictionary<string,byte[]>(local,StringComparer.Ordinal);RebuildIndexes(diagnostic,warnings);}
        // Validate both sides before offering either version, without touching disk.
        if(!project)foreach(var set in new[]{local,files})foreach(var item in set.Where(p=>p.Key.EndsWith(".json")))JsonNode.Parse(item.Value);
        plan=new Plan(Guid.NewGuid().ToString("N"),head,tree,local,files,remote,baseline,entries,warnings);
        progress="Porovnání dokončeno.";
        return new {
            planId=plan.Id,scope=project?"project":"data",target=S(settings,"owner")+"/"+S(settings,"repo")+" · "+S(settings,"branch")+(project?" · /Source + /Licenses":" · /"+S(settings,"folder")),
            changes=entries.Where(e=>e.Action!="equal").Select(e=>new{path=e.Path,action=e.Action,localBytes=e.Local?.Length??0,remoteBytes=e.Remote?.Length??0,unknownBase=e.Action=="conflict"&&baseline["hashes"]?[e.Path]==null}),
            unchanged=entries.Count(e=>e.Action=="equal"),conflicts=entries.Count(e=>e.Action=="conflict"),firstSync=baseline["hashes"]==null,
            uploads=entries.Count(e=>e.Action is "upload" or "merge"),downloads=entries.Count(e=>e.Action is "download" or "merge"),warnings,hasToken=token!=""
        };
    }
    object Preview(JsonObject body)
    {
        var p=plan??throw new Exception("Nejdříve porovnej změny.");if(p.Id!=S(body,"planId"))throw new Exception("Porovnání již není aktuální.");
        var entry=p.Entries.FirstOrDefault(e=>e.Path==S(body,"path"))??throw new Exception("Soubor není v porovnání.");
        var isJson=project?ProjectFiles.IsText(entry.Path):entry.Path.EndsWith(".json");
        string View(byte[]? bytes) {
            if(bytes==null)return "Soubor chybí.";
            if(isJson){var value=Encoding.UTF8.GetString(bytes);return value.Length>200000?value[..200000]+"\n… náhled zkrácen …":value;}
            if(project&&!ProjectFiles.IsImage(entry.Path))return "Binární soubor: "+bytes.Length+" bajtů; SHA-256: "+Hash(bytes);
            var mime=Path.GetExtension(entry.Path).ToLowerInvariant() switch {".png"=>"image/png",".webp"=>"image/webp",".ico"=>"image/x-icon",_=>"image/jpeg"};
            return "data:"+mime+";base64,"+Convert.ToBase64String(bytes);
        }
        return new {path=entry.Path,isJson,local=View(entry.Local),remote=View(entry.Remote)};
    }
    static void Manifest(Dictionary<string,byte[]> files,Dictionary<string,byte[]> remote,bool publishing)
    {
        var entries=new JsonArray();foreach(var entry in files.Where(e=>e.Key!="manifest.json").OrderBy(e=>e.Key,StringComparer.Ordinal))entries.Add(new JsonObject{["path"]=entry.Key,["sha256"]=Hash(entry.Value),["bytes"]=entry.Value.Length});
        var prior=remote.TryGetValue("manifest.json",out var bytes)?JsonNode.Parse(bytes) as JsonObject:null;
        var manifest=prior?.DeepClone() as JsonObject??new JsonObject();
        manifest["schemaVersion"]=1;manifest["database"]="database.json";manifest["artists"]="artists.json";manifest["config"]="config.json";manifest["songsDirectory"]="songs/";manifest["assetDirectories"]=new JsonArray("img/covers/","img/interprets/","chords/");manifest["files"]=entries;
        if(prior==null||!JsonNode.DeepEquals(prior["files"],entries)) {
            manifest["libraryVersion"]=(publishing?"":"local-")+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N")[..8];
            manifest.Remove("publishedAt");manifest.Remove("generatedAt");manifest[publishing?"publishedAt":"generatedAt"]=DateTime.UtcNow.ToString("O");
        }
        files["manifest.json"]=Bytes(manifest);
    }
    internal static void RebuildIndexes(Dictionary<string,byte[]> files,List<string> warnings)
    {
        var old=files.TryGetValue("database.json",out var db)?JsonNode.Parse(db) as JsonArray:null;
        var oldArtists=files.TryGetValue("artists.json",out var arts)?JsonNode.Parse(arts) as JsonArray:null;
        var rows=new JsonArray();
        foreach(var item in files.Where(p=>p.Key.StartsWith("songs/")).OrderBy(p=>p.Key,StringComparer.Ordinal)){
            var song=JsonNode.Parse(item.Value) as JsonObject??throw new Exception("Neplatná píseň: "+item.Key);
            var artist=S(song,"artist").Trim();var title=S(song,"title").Trim();if(artist==""||title==""||song["parts"] is not JsonArray)throw new Exception("Chybí interpret, název nebo sekce: "+item.Key);
            var file=item.Key[6..];var row=old?.FirstOrDefault(n=>S(n,"file").Replace("songs/","")==file)?.DeepClone() as JsonObject??new();
            var albumChanged=row.ContainsKey("artist")&&(S(row,"album")!=S(song,"album")||S(row,"artist")!=artist);
            foreach(var k in new[]{"artist","title","album","year"})row[k]=song[k]?.DeepClone();row["artistKey"]=LibraryStore.Slug(artist);row["file"]=file;
            if(S(row,"cover")==""||albumChanged)row["cover"]="img/covers/"+LibraryStore.Slug(artist)+"-"+LibraryStore.Slug(S(song,"album"))+".jpg";
            row["status"]=song["status"] is JsonObject st?st["state"]?.DeepClone():song["status"]?.DeepClone();row["played"]=song["playback"]?["played"]?.DeepClone()??JsonValue.Create(false);rows.Add(row);
        }
        if(rows.Count==0)throw new Exception("Knihovna neobsahuje žádné písně.");
        var artists=new JsonArray();foreach(var g in rows.GroupBy(n=>S(n,"artistKey"))){var a=oldArtists?.FirstOrDefault(n=>S(n,"artistKey")==g.Key)?.DeepClone() as JsonObject??new();a["artistKey"]=g.Key;a["artist"]=g.First()?["artist"]?.DeepClone();a["count"]=g.Count();if(S(a,"cover")=="")a["cover"]="img/interprets/"+g.Key+".jpg";artists.Add(a);}
        foreach(var path in rows.Concat(artists).Select(n=>S(n,"cover")).Distinct())if(path!=""&&!files.ContainsKey(path))warnings.Add("Chybí obrázek: "+path);
        foreach(var item in files.Where(p=>p.Key.StartsWith("chords/")))if(JsonNode.Parse(item.Value) is not JsonObject)throw new Exception("Neplatná databáze akordů: "+item.Key);
        files["database.json"]=Bytes(rows);files["artists.json"]=Bytes(artists);
    }
    async Task<object> Synchronize(JsonObject body,bool publish)
    {
        var p=plan??throw new Exception("Nejprve porovnej změny.");if(p.Id!=S(body,"planId"))throw new Exception("Porovnání již není aktuální.");
        var choices=body["choices"] as JsonObject??new();
        var selected=SyncComparison.Select(p.Entries,choices);
        var warnings=new List<string>();var files=project?new Dictionary<string,byte[]>(selected,StringComparer.Ordinal):SyncComparison.Materialize(selected,warnings);
        if(!project)Manifest(files,p.RemoteFiles,publish);
        if(files.Sum(e=>(long)e.Value.Length)>100000000)throw new Exception("Výsledek je větší než 100 MB.");
        var changes=files.Where(e=>!p.Remote.TryGetValue(e.Key,out var sha)||sha!=BlobHash(e.Value)).Select(e=>e.Key).OrderBy(x=>x,StringComparer.Ordinal).ToList();
        if(publish&&changes.Count>0&&token=="")throw new Exception("Pro odeslání změn vyplň token s Contents: Read and write. Samotné načtení veřejné databáze token nepotřebuje.");
        if(!Same(p.Local,Snapshot())||!JsonNode.DeepEquals(p.Baseline,ActiveStore.ReadSyncState(StateKey))){plan=null;throw new Exception("Místní data se změnila. Porovnej znovu.");}
        if(S((await Api("GET","git/ref/heads/"+Branch))["object"],"sha")!=p.Head){plan=null;throw new Exception("GitHub se od porovnání změnil. Porovnej znovu.");}
        plan=null;
        var sha=p.Head;
        if(publish&&changes.Count>0) {
            var tree=new JsonArray();var sent=0;
            foreach(var path in changes) {
                progress="Odesílám "+(++sent)+" / "+changes.Count+": "+path;
                var blob=await Api("POST","git/blobs",new JsonObject{["content"]=Convert.ToBase64String(files[path]),["encoding"]="base64"});
                tree.Add(new JsonObject{["path"]=Prefix+path,["mode"]="100644",["type"]="blob",["sha"]=S(blob,"sha")});
            }
            progress=project?"Dokončuji verzi zdrojů a licencí…":"Dokončuji společnou verzi a manifest…";
            var result=await Api("POST","git/trees",new JsonObject{["base_tree"]=p.Tree,["tree"]=tree});
            var commit=await Api("POST","git/commits",new JsonObject{["message"]="Zpěvník: synchronizace "+(project?"Source a Licenses":"databáze")+" ("+changes.Count+" souborů)",["tree"]=S(result,"sha"),["parents"]=new JsonArray(p.Head)});
            sha=S(commit,"sha");await Api("PATCH","git/refs/heads/"+Branch,new JsonObject{["sha"]=sha,["force"]=false});
        }
        progress="Ukládám místní data a společný stav…";
        var baseline=SyncComparison.Baseline(publish?files:p.RemoteFiles,sha);
        var uploaded=publish&&changes.Count>0;
        try {
            if(!(project?projectStore.ApplyProjectSync(p.Local,p.Baseline,files,baseline,StateKey):store.ApplySync(p.Local,p.Baseline,files,baseline,StateKey)))throw new Exception("Místní data se během synchronizace změnila. Zůstala zachovaná; porovnej znovu.");
        } catch(Exception ex) {
            if(uploaded)return new {ok=true,localApplied=false,message="GitHub byl aktualizován, ale místní data nebyla synchronizována: "+ex.Message,url="https://github.com/"+S(settings,"owner")+"/"+S(settings,"repo")+"/commit/"+sha};
            throw;
        }
        var pending=SyncComparison.Compare(SyncComparison.Normalize(files),SyncComparison.Normalize(publish?files:p.RemoteFiles),baseline).Count(e=>e.Action!="equal");
        return new {ok=true,localApplied=true,scope=project?"project":"data",commit=sha,message=project?(publish?"Source a Licenses jsou synchronizované. EXE se nemění.":"Source a Licenses načteny. EXE se nemění. Místní změny k odeslání: "+pending+"."):publish?"Synchronizace dokončena. Místní data i GitHub jsou sjednocené.":"Změny z GitHubu načteny. Místní změny k odeslání: "+pending+". Na GitHub nebylo nic zapsáno.",warnings,url="https://github.com/"+S(settings,"owner")+"/"+S(settings,"repo")+"/commit/"+sha};
    }
    internal static bool Same(Dictionary<string,byte[]> a,Dictionary<string,byte[]> b)=>a.Count==b.Count&&a.All(e=>b.TryGetValue(e.Key,out var bytes)&&e.Value.AsSpan().SequenceEqual(bytes));
}
