using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
namespace Zpevnik;

// Three-way comparison: local content, remote content, last acknowledged remote state.
static class SyncComparison
{
    internal sealed record Entry(string Path,string Action,byte[]? Local,byte[]? Remote,byte[]? Selected);
    internal static string Hash(byte[] bytes)=>Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    internal static byte[] Bytes(JsonNode node)=>Encoding.UTF8.GetBytes(node.ToJsonString(new JsonSerializerOptions{WriteIndented=true, Encoder=System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All)}));
    static string S(JsonNode? n,string key)=>n?[key]?.GetValue<string>()??"";
    internal static JsonObject PublicConfig(byte[]? bytes)
    {
        var original=bytes==null?new JsonObject():JsonNode.Parse(bytes)!.AsObject();var result=new JsonObject();
        foreach(var key in new[]{"appTitle","appVersion","defaultTheme","searchPlaceholder","homeTitle","loadingText"})
            if(original[key] is JsonValue value&&value.TryGetValue<string>(out var text))result[key]=text;
        if(original["sectionLabels"] is JsonObject labels) {
            var clean=new JsonObject();foreach(var key in new[]{"intro","verse","chorus","bridge","outro"})if(labels[key] is JsonValue value&&value.TryGetValue<string>(out var text))clean[key]=text;
            result["sectionLabels"]=clean;
        }
        result["schemaVersion"]=1;result["paths"]=new JsonObject{["database"]="database.json",["artists"]="artists.json",["songs"]="songs/",["covers"]="img/covers/",["interprets"]="img/interprets/",["chords"]="chords/"};return result;
    }
    internal static bool IsMetadata(string path)=>path is "database.json" or "artists.json";
    internal static Dictionary<string,byte[]> Normalize(Dictionary<string,byte[]> raw)
    {
        var result=new Dictionary<string,byte[]>(StringComparer.Ordinal);
        foreach(var pair in raw) {
            if(pair.Key=="manifest.json")continue;
            if(pair.Key=="config.json"){result[pair.Key]=Bytes(PublicConfig(pair.Value));continue;}
            if(!IsMetadata(pair.Key)){result[pair.Key]=pair.Value;continue;}
            var rows=JsonNode.Parse(pair.Value)!.AsArray();var metadata=new JsonObject();
            var key=pair.Key=="database.json"?"file":"artistKey";
            var derived=pair.Key=="database.json"?new[]{"file","artist","artistKey","title","album","year","status","played"}:new[]{"artistKey","artist","count"};
            foreach(var row in rows){var id=S(row,key);if(key=="file"&&id.StartsWith("songs/"))id=id[6..];if(id=="")continue;var data=new JsonObject();foreach(var property in row!.AsObject().OrderBy(e=>e.Key,StringComparer.Ordinal))if(!derived.Contains(property.Key))data[property.Key]=property.Value?.DeepClone();metadata[id]=data;}
            var sorted=new JsonObject();foreach(var row in metadata.OrderBy(e=>e.Key,StringComparer.Ordinal))sorted[row.Key]=row.Value?.DeepClone();result[pair.Key]=Bytes(sorted);
        }
        return result;
    }
    internal static List<Entry> Compare(Dictionary<string,byte[]> local,Dictionary<string,byte[]> remote,JsonObject baseline)
    {
        var result=new List<Entry>();
        foreach(var path in local.Keys.Union(remote.Keys).OrderBy(p=>p,StringComparer.Ordinal)) {
            local.TryGetValue(path,out var l);remote.TryGetValue(path,out var r);
            var lh=l==null?"":Hash(l);var rh=r==null?"":Hash(r);var bh=S(baseline["hashes"],path);
            if(lh==rh){result.Add(new(path,"equal",l,r,l));continue;}
            // Deletions are not propagated. An existing copy is restored rather than lost.
            if(l==null){result.Add(new(path,"download",l,r,r));continue;}
            if(r==null){result.Add(new(path,"upload",l,r,l));continue;}
            if(lh==bh){result.Add(new(path,"download",l,r,r));continue;}
            if(rh==bh){result.Add(new(path,"upload",l,r,l));continue;}
            if(IsMetadata(path)&&TryMerge(baseline["metadata"]?[path],JsonNode.Parse(l),JsonNode.Parse(r),out var merged)) {
                var b=Bytes(merged!);result.Add(new(path,Hash(b)==lh?"upload":Hash(b)==rh?"download":"merge",l,r,b));continue;
            }
            result.Add(new(path,"conflict",l,r,null));
        }
        return result;
    }
    static bool TryMerge(JsonNode? b,JsonNode? l,JsonNode? r,out JsonNode? result)
    {
        if(JsonNode.DeepEquals(l,r)){result=l?.DeepClone();return true;}
        if(JsonNode.DeepEquals(l,b)){result=r?.DeepClone();return true;}
        if(JsonNode.DeepEquals(r,b)){result=l?.DeepClone();return true;}
        if(l is JsonObject lo&&r is JsonObject ro&&(b==null||b is JsonObject)) {
            var merged=new JsonObject();foreach(var key in lo.Select(x=>x.Key).Union(ro.Select(x=>x.Key)).OrderBy(x=>x,StringComparer.Ordinal)) {
                if(!TryMerge(b?[key],lo[key],ro[key],out var child)){result=null;return false;}
                if(child!=null)merged[key]=child;
            }
            result=merged;return true;
        }
        result=null;return false;
    }
    internal static Dictionary<string,byte[]> Select(List<Entry> entries,JsonObject choices)
    {
        var selected=new Dictionary<string,byte[]>(StringComparer.Ordinal);
        foreach(var e in entries) {
            var bytes=e.Selected;
            if(e.Action=="conflict")bytes=S(choices,e.Path) switch {"local"=>e.Local,"remote"=>e.Remote,_=>throw new Exception("Vyber verzi konfliktu: "+e.Path)};
            if(bytes!=null)selected[e.Path]=bytes;
        }
        return selected;
    }
    internal static Dictionary<string,byte[]> Materialize(Dictionary<string,byte[]> selected,List<string> warnings)
    {
        var files=new Dictionary<string,byte[]>(selected,StringComparer.Ordinal);
        foreach(var path in new[]{"database.json","artists.json"}) {
            var rows=new JsonArray();var key=path=="database.json"?"file":"artistKey";
            if(files.TryGetValue(path,out var bytes))foreach(var pair in JsonNode.Parse(bytes)!.AsObject()) {var row=pair.Value!.DeepClone().AsObject();row[key]=pair.Key;rows.Add(row);}
            files[path]=Bytes(rows);
        }
        GithubPublisher.RebuildIndexes(files,warnings);
        files["config.json"]=Bytes(PublicConfig(files.GetValueOrDefault("config.json")));
        if(files.Sum(x=>(long)x.Value.Length)>100000000)throw new Exception("Spojená knihovna je větší než 100 MB.");
        return files;
    }
    internal static JsonObject Baseline(Dictionary<string,byte[]> raw,string commit)
    {
        var files=Normalize(raw);var hashes=new JsonObject();var metadata=new JsonObject();
        foreach(var entry in files){hashes[entry.Key]=Hash(entry.Value);if(IsMetadata(entry.Key))metadata[entry.Key]=JsonNode.Parse(entry.Value);}
        return new JsonObject{["schemaVersion"]=1,["commit"]=commit,["hashes"]=hashes,["metadata"]=metadata};
    }
}
