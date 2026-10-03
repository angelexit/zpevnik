using System.Text;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Globalization;
using System.Text.RegularExpressions;
namespace Zpevnik;

// All writable content lives in the selected library; application resources stay immutable.
sealed class LibraryStore
{
    readonly string root;
    readonly Mutex gate;
    public LibraryStore(string directory) { root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(directory)); gate = new Mutex(false, "Local\\ZpevnikLibrary-" + Hash(Encoding.UTF8.GetBytes(root.ToUpperInvariant()))); }
    static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    string Resolve(string path)
    {
        path = path.Replace('\\','/');
        if (string.IsNullOrWhiteSpace(path) || Path.IsPathRooted(path) || path.Contains(':') || path.Split('/').Any(s=>s is ".." or "." or "")) throw new Exception("Neplatná cesta v knihovně.");
        var full = Path.GetFullPath(Path.Combine(root,path));
        if (!full.StartsWith(root.TrimEnd('\\')+"\\",StringComparison.OrdinalIgnoreCase)) throw new Exception("Cesta mimo knihovnu.");
        for(var check=full; !string.Equals(check,root,StringComparison.OrdinalIgnoreCase); check=Path.GetDirectoryName(check)!)
            if (string.IsNullOrEmpty(check)) throw new Exception("Cesta mimo knihovnu.");
            else if ((File.Exists(check)||Directory.Exists(check)) && (File.GetAttributes(check)&FileAttributes.ReparsePoint)!=0) throw new Exception("Odkazované složky nejsou podporovány.");
        return full;
    }
    JsonNode Read(string path) => JsonNode.Parse(File.ReadAllText(Resolve(path)))!;
    string Revision(string path) => File.Exists(Resolve(path)) ? Hash(File.ReadAllBytes(Resolve(path))) : "";
    static string S(JsonNode? n,string key) => n?[key]?.GetValue<string>() ?? "";
    static byte[] Bytes(JsonNode n) => Encoding.UTF8.GetBytes(n.ToJsonString(new System.Text.Json.JsonSerializerOptions { WriteIndented=true, Encoder=System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All) }));
    public static string Slug(string value) => Regex.Replace(Regex.Replace(new string(value.Normalize(NormalizationForm.FormD).Where(c=>CharUnicodeInfo.GetUnicodeCategory(c)!=UnicodeCategory.NonSpacingMark).ToArray()).ToLowerInvariant().Trim(),@"\s+","_"),"[^a-z0-9_]","");
    void Commit(Dictionary<string,byte[]> changes)
    {
        var backup = ".backups/"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fffffff")+"-"+Guid.NewGuid().ToString("N");
        var old = new Dictionary<string,byte[]?>(); var staged = new Dictionary<string,string>();
        try {
            foreach(var item in changes) {
                var full=Resolve(item.Key); Directory.CreateDirectory(Path.GetDirectoryName(full)!);
                old[item.Key]=File.Exists(full)?File.ReadAllBytes(full):null;
                if(old[item.Key]!=null) { var copy=Resolve(backup+"/"+item.Key); Directory.CreateDirectory(Path.GetDirectoryName(copy)!); File.WriteAllBytes(copy,old[item.Key]!); }
                var temp=full+"."+Guid.NewGuid().ToString("N")+".tmp"; staged[item.Key]=temp; File.WriteAllBytes(temp,item.Value);
            }
            foreach(var item in staged) File.Move(item.Value,Resolve(item.Key),true);
        } catch {
            foreach(var item in old) { if(item.Value!=null) File.WriteAllBytes(Resolve(item.Key),item.Value); else if(File.Exists(Resolve(item.Key))) File.Delete(Resolve(item.Key)); }
            throw;
        } finally { foreach(var temp in staged.Values) if(File.Exists(temp)) File.Delete(temp); }
    }
    public object Handle(string endpoint, JsonObject body, bool write)
    {
        try { gate.WaitOne(); } catch(AbandonedMutexException) { }
        try {
            var path=S(body,"path");
            if(endpoint=="library" && !write) return new { id=Hash(Encoding.UTF8.GetBytes(root.ToUpperInvariant())),directory=root,database=Read("database.json") };
            if(endpoint=="read" && !write) {
                if(!(path.StartsWith("songs/")||path.StartsWith("chords/"))||!path.EndsWith(".json")) throw new Exception("Nepodporovaný soubor.");
                return new { value=Read(path),revision=Revision(path) };
            }
            if(endpoint=="list" && !write) {
                if(path!="songs" && path!="img/covers") throw new Exception("Nepodporovaná složka.");
                var full=Resolve(path); return Directory.Exists(full)?Directory.EnumerateFiles(full,"*",SearchOption.AllDirectories).Where(f=>!(File.GetAttributes(f).HasFlag(FileAttributes.ReparsePoint))).Select(f=>Path.GetRelativePath(full,f).Replace('\\','/')).ToArray():Array.Empty<string>();
            }
            if(endpoint=="song" && write) {
                var song=body["song"] as JsonObject ?? throw new Exception("Chybí píseň.");
                var artist=S(song,"artist").Trim(); var title=S(song,"title").Trim();
                if(artist==""||title==""||song["parts"] is not JsonArray) throw new Exception("Vyplň interpreta, název a sekce písně.");
                var file=S(body,"file").Replace('\\','/'); if(file.StartsWith("songs/")) file=file[6..];
                var existing=file!="";
                if(!existing) { var a=Slug(artist);var t=Slug(title);if(a==""||t=="") throw new Exception("Název musí obsahovat také písmena nebo číslice použitelné pro název souboru."); file=a+"-"+t+".json"; }
                if(!file.EndsWith(".json")) throw new Exception("Píseň musí být JSON.");
                path="songs/"+file; var revision=Revision(path);
                if(existing && (revision==""||revision!=S(body,"revision"))) throw new Exception("Soubor byl mezitím změněn nebo odstraněn. Rozpracované úpravy zůstaly v editoru. Načti aktuální píseň před dalším uložením.");
                if(!existing && revision!="") throw new Exception("Píseň s tímto názvem souboru již existuje. Vyber ji ze seznamu, nebo použij jiný název.");
                song=(JsonObject)song.DeepClone();song["artist"]=artist;song["title"]=title;song["artistKey"]=Slug(artist);
                var db=(JsonArray)Read("database.json");
                var previous=db.FirstOrDefault(n=>S(n,"file").Replace("songs/","")==file);
                var row=previous?.DeepClone() as JsonObject ?? new JsonObject();
                foreach(var k in new[]{"artist","title","artistKey","album","year"}) row[k]=song[k]?.DeepClone();
                row["file"]=file;
                if(previous==null || S(previous,"album")!=S(song,"album") || S(previous,"artist")!=artist) row["cover"]="img/covers/"+Slug(artist)+"-"+Slug(S(song,"album"))+".jpg";
                row["status"]=song["status"] is JsonObject status ? status["state"]?.DeepClone() : song["status"]?.DeepClone();row["played"]=song["playback"]?["played"]?.DeepClone()??JsonValue.Create(false);
                for(var i=db.Count-1;i>=0;i--) if(S(db[i],"file").Replace("songs/","")==file) db.RemoveAt(i);
                db.Add(row);
                var oldArtists=(JsonArray)Read("artists.json");var artists=new JsonArray();
                foreach(var group in db.GroupBy(n=>S(n,"artistKey"))) {
                    var a=oldArtists.FirstOrDefault(n=>S(n,"artistKey")==group.Key)?.DeepClone() as JsonObject ?? new JsonObject { ["cover"]="img/interprets/"+group.Key+".jpg" };
                    a["artistKey"]=group.Key;a["artist"]=group.First()?["artist"]?.DeepClone();a["count"]=group.Count();artists.Add(a);
                }
                Commit(new() { [path]=Bytes(song),["database.json"]=Bytes(db),["artists.json"]=Bytes(artists) });
                return new { file,revision=Revision(path),song };
            }
            if(endpoint=="chord" && write) {
                if(!path.StartsWith("chords/")||!path.EndsWith(".json")||path[7..].Contains('/')) throw new Exception("Neplatná databáze akordů.");
                if(Revision(path)!=S(body,"revision")) throw new Exception("Databáze akordů byla mezitím změněna. Načti ji znovu; úpravy zůstaly v editoru.");
                var name=S(body,"name").Trim(); var original=S(body,"original");
                if(name=="" || body["entry"] is not JsonObject entry || entry["ps"] is not JsonArray positions || positions.Count==0) throw new Exception("Chybí název nebo hmat akordu.");
                foreach(var position in positions) if(position?["f"] is not JsonArray) throw new Exception("Neplatný hmat akordu.");
                var db=(JsonObject)Read(path);
                if(name!=original && db.ContainsKey(name)) throw new Exception("Akord s tímto názvem již existuje. Vyber jej ze seznamu.");
                if(original!="" && !db.ContainsKey(original)) throw new Exception("Původní akord již neexistuje.");
                if(original!=""&&name!=original) db.Remove(original);
                db[name]=entry.DeepClone(); Commit(new(){[path]=Bytes(db)});return new { revision=Revision(path),value=db };
            }
            if(endpoint=="cover" && write) {
                if(!Regex.IsMatch(path,@"^img/covers/[a-z0-9_-]+\.jpg$")) throw new Exception("Neplatný název obalu.");
                var bytes=Convert.FromBase64String(S(body,"base64"));if(bytes.Length>15000000 || bytes.Length<3 || bytes[0]!=255 || bytes[1]!=216) throw new Exception("Neplatný obrázek JPEG.");
                Commit(new(){[path]=bytes});return new { ok=true };
            }
            throw new Exception("Nepodporovaná operace.");
        } finally { gate.ReleaseMutex(); }
    }
    public Dictionary<string,byte[]> PublishSnapshot()
    {
        try { gate.WaitOne(); } catch(AbandonedMutexException) { }
        try {
            var result=new Dictionary<string,byte[]>(StringComparer.Ordinal);
            foreach(var path in new[]{"database.json","artists.json","config.json","manifest.json"})
                if(File.Exists(Resolve(path)))result[path]=File.ReadAllBytes(Resolve(path));
            foreach(var folder in new[]{"songs","chords","img/covers","img/interprets"}) {
                var full=Resolve(folder);if(!Directory.Exists(full))continue;
                foreach(var file in Directory.EnumerateFiles(full)) {
                    var path=folder+"/"+Path.GetFileName(file);if(!GithubPublisher.Managed(path))continue;
                    if(new FileInfo(file).Length>10000000)throw new Exception("Soubor je větší než 10 MB: "+path);
                    result[path]=File.ReadAllBytes(Resolve(path));
                }
            }
            if(result.Sum(e=>(long)e.Value.Length)>100000000)throw new Exception("Databáze je větší než 100 MB.");
            return result;
        } finally {gate.ReleaseMutex();}
    }
    public Dictionary<string,byte[]> ProjectSnapshot()
    {
        try {gate.WaitOne();}catch(AbandonedMutexException) { }
        try {
            var result=new Dictionary<string,byte[]>(StringComparer.Ordinal);long total=0;
            void Walk(string folder) {
                var full=Resolve(folder);if(!Directory.Exists(full))return;
                foreach(var entry in Directory.EnumerateFileSystemEntries(full)) {
                    var path=folder+"/"+Path.GetFileName(entry);
                    if(Directory.Exists(entry)) {if(ProjectFiles.DirectoryAllowed(path))Walk(path);continue;}
                    if(!ProjectFiles.Managed(path))continue;
                    var safe=Resolve(path);var length=new FileInfo(safe).Length;if(length>10000000)throw new Exception("Soubor je větší než 10 MB: "+path);
                    var bytes=File.ReadAllBytes(safe);total+=bytes.Length;if(total>100000000||result.Count>=10000)throw new Exception("Zdroje jsou příliš velké (100 MB / 10 000 souborů).");result[path]=bytes;
                }
            }
            Walk("Source");Walk("Licenses");return result;
        } finally {gate.ReleaseMutex();}
    }
    public bool ApplyProjectSync(Dictionary<string,byte[]> expected,JsonObject expectedState,Dictionary<string,byte[]> files,JsonObject baseline,string key)
    {
        try {gate.WaitOne();}catch(AbandonedMutexException) { }
        try {
            var local=ProjectSnapshot();if(!GithubPublisher.Same(expected,local)||!JsonNode.DeepEquals(expectedState,ReadSyncState(key)))return false;
            var changes=new Dictionary<string,byte[]>();
            foreach(var entry in files) {
                if(!ProjectFiles.Managed(entry.Key))throw new Exception("Nepodporovaný zdrojový soubor.");
                if(!local.TryGetValue(entry.Key,out var old)||!old.AsSpan().SequenceEqual(entry.Value))changes[entry.Key]=entry.Value;
            }
            changes[".sync/"+key+".json"]=Bytes(baseline);Commit(changes);return true;
        } finally {gate.ReleaseMutex();}
    }
    public JsonObject ReadSyncState(string key)
    {
        if(!Regex.IsMatch(key,"^[a-f0-9]{64}$"))throw new Exception("Neplatný stav synchronizace.");
        try {gate.WaitOne();}catch(AbandonedMutexException) { }
        try {var path=Resolve(".sync/"+key+".json");return File.Exists(path)?JsonNode.Parse(File.ReadAllBytes(path))!.AsObject():new JsonObject();}
        finally {gate.ReleaseMutex();}
    }
    public bool ApplySync(Dictionary<string,byte[]> expected,JsonObject expectedState,Dictionary<string,byte[]> files,JsonObject baseline,string key)
    {
        try {gate.WaitOne();}catch(AbandonedMutexException) { }
        try {
            var local=PublishSnapshot();if(!GithubPublisher.Same(expected,local)||!JsonNode.DeepEquals(expectedState,ReadSyncState(key)))return false;
            var changes=new Dictionary<string,byte[]>();
            foreach(var entry in files) {
                if(!GithubPublisher.Managed(entry.Key))throw new Exception("Nepodporovaný synchronizovaný soubor.");
                var content=entry.Value;
                if(entry.Key=="config.json"&&local.TryGetValue("config.json",out var cfg)) {
                    var config=JsonNode.Parse(cfg)!.AsObject();foreach(var publicKey in new[]{"appTitle","appVersion","defaultTheme","searchPlaceholder","homeTitle","loadingText","sectionLabels","schemaVersion","paths"})config.Remove(publicKey);foreach(var item in JsonNode.Parse(content)!.AsObject())config[item.Key]=item.Value?.DeepClone();content=Bytes(config);
                }
                if(!local.TryGetValue(entry.Key,out var old)||!old.AsSpan().SequenceEqual(content))changes[entry.Key]=content;
            }
            changes[".sync/"+key+".json"]=Bytes(baseline);
            Commit(changes);return true;
        } finally {gate.ReleaseMutex();}
    }
    public void Seed(Dictionary<string,byte[]> assets)
    {
        try { gate.WaitOne(); } catch(AbandonedMutexException) { }
        try { foreach(var pair in assets.Where(p=>p.Key.StartsWith("chord-seeds/")&&p.Key.EndsWith(".json"))) {
            var path=Resolve("chords/"+Path.GetFileName(pair.Key));Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            if(!File.Exists(path)) { using var f=new FileStream(path,FileMode.CreateNew);f.Write(pair.Value); }
        }} finally {gate.ReleaseMutex();}
    }
}
