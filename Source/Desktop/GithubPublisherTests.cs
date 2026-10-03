using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
namespace Zpevnik;

static class GithubPublisherTests
{
    static JsonObject Obj(object x)=>JsonSerializer.SerializeToNode(x)!.AsObject();
    static string S(JsonNode? n,string k)=>n?[k]?.GetValue<string>()??"";
    static void Assert(bool ok,string message){if(!ok)throw new Exception(message);}
    public static async Task Run(string report,string source)
    {
        const string sample="Příliš žluťoučký kůň úpěl ďábelské ódy.\n\"Akord\" [C] \\";
        foreach(var type in new[]{typeof(LibraryStore),typeof(GithubPublisher),typeof(SyncComparison)}) {
            var method=type.GetMethod("Bytes",System.Reflection.BindingFlags.Static|System.Reflection.BindingFlags.NonPublic)!;
            var bytes=(byte[])method.Invoke(null,new object[]{new JsonObject{["text"]=sample}})!;
            var text=Encoding.UTF8.GetString(bytes);
            Assert(text.Contains("Příliš žluťoučký kůň"),type.Name+": Czech characters must remain readable");
            Assert(JsonNode.Parse(bytes)!["text"]!.GetValue<string>()==sample,type.Name+": JSON round trip must preserve text and escapes");
        }
        var root=Path.Combine(Path.GetDirectoryName(Path.GetFullPath(report))!,"publisher-test-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(root);
        var pathFixture=Path.Combine(root,"path-fixture");Directory.CreateDirectory(Path.Combine(pathFixture,"Source"));File.WriteAllText(Path.Combine(pathFixture,"Source","test.js"),"// test");
        var pathCheck=Task.Run(()=>new LibraryStore(pathFixture+Path.DirectorySeparatorChar).ProjectSnapshot());
        Assert(await Task.WhenAny(pathCheck,Task.Delay(5000))==pathCheck,"Trailing directory separator caused snapshot to hang");
        Assert((await pathCheck).ContainsKey("Source/test.js"),"Trailing directory separator snapshot missing source");
        var library=Path.Combine(root,"Data");Directory.CreateDirectory(library);
        foreach(var file in Directory.EnumerateFiles(source,"*",SearchOption.AllDirectories)) {var target=Path.Combine(library,Path.GetRelativePath(source,file));Directory.CreateDirectory(Path.GetDirectoryName(target)!);File.Copy(file,target);}
        var store=new LibraryStore(library);var fake=new FakeGitHub();
        fake.Add("README.md",Encoding.UTF8.GetBytes("untouched"));
        fake.Add("data/songs/remote-only.json",Encoding.UTF8.GetBytes("{\"artist\":\"Remote artist\",\"title\":\"Remote song\",\"parts\":[]}"));
        File.WriteAllText(Path.Combine(library,"config.json"),"{\"appTitle\":\"Songbook\",\"adminPassword\":\"DO-NOT-SEND\",\"private\":{\"token\":\"DO-NOT-SEND\"}}");
        var publisher=new GithubPublisher(store,library,fake,Path.Combine(root,"preferences.json"));
        await publisher.Handle("settings",new JsonObject{["owner"]="test",["repo"]="songs",["branch"]="main",["folder"]="data",["token"]="TEST-TOKEN"},true);
        var settings=Obj(await publisher.Handle("settings",new(),false));Assert(!settings.ToJsonString().Contains("TEST-TOKEN"),"Token exposed by settings");Assert(!File.ReadAllText(Path.Combine(root,"preferences.json")).Contains("TEST-TOKEN"),"Token persisted");
        var restored=new GithubPublisher(store,library,fake,Path.Combine(root,"preferences.json"));
        Assert(Obj(await restored.Handle("settings",new(),false))["hasToken"]!.GetValue<bool>(),"Token not restored");
        Assert(!Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(root,"preferences.json.token"))).Contains("TEST-TOKEN"),"Unencrypted token");
        var plan=Obj(await publisher.Handle("check",new(),true));Assert(plan["changes"]!.AsArray().Count>100,"Missing data in plan");
        var result=Obj(await publisher.Handle("publish",new JsonObject{["planId"]=S(plan,"planId")},true));Assert(result["ok"]!.GetValue<bool>(),"Publish failed");
        Assert(fake.Files.ContainsKey("README.md")&&fake.Files.ContainsKey("data/songs/remote-only.json"),"Remote-only lost");
        Assert(fake.Patches==1,"Publish was not atomic");
        Assert(!Encoding.UTF8.GetString(fake.Read("data/config.json")).Contains("DO-NOT-SEND"),"Credential included in config");
        var manifest=JsonNode.Parse(fake.Read("data/manifest.json"))!;
        foreach(var entry in manifest["files"]!.AsArray()){
            var b=fake.Read("data/"+S(entry,"path"));Assert(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(b)).ToLowerInvariant()==S(entry,"sha256"),"Manifest checksum");
        }
        var again=Obj(await publisher.Handle("check",new(),true));Assert(again["changes"]!.AsArray().Count==0,"Second publish not idempotent: "+again.ToJsonString());
        var song=Directory.GetFiles(Path.Combine(library,"songs"))[0];var old=File.ReadAllText(song);File.WriteAllText(song,old+" ");
        await Fails(()=>publisher.Handle("publish",new JsonObject{["planId"]=S(again,"planId")},true),"local changed");Assert(fake.Patches==1,"Stale local plan published");
        var changed=Obj(await publisher.Handle("check",new(),true));fake.Advance();
        await Fails(()=>publisher.Handle("publish",new JsonObject{["planId"]=S(changed,"planId")},true),"remote changed");Assert(fake.Patches==1,"Stale remote plan published");
        changed=Obj(await publisher.Handle("check",new(),true));fake.FailBlob=true;var head=fake.Head;
        await Fails(()=>publisher.Handle("publish",new JsonObject{["planId"]=S(changed,"planId")},true),"network failure");Assert(fake.Head==head,"Partial upload visible");fake.FailBlob=false;
        changed=Obj(await publisher.Handle("check",new(),true));fake.RaceOnPatch=true;
        await Fails(()=>publisher.Handle("publish",new JsonObject{["planId"]=S(changed,"planId")},true),"concurrent publish");Assert(fake.Patches==1,"Forced concurrent update");fake.RaceOnPatch=false;
        Assert(!GithubPublisher.Managed(".backups/secret.json")&&!GithubPublisher.Managed("settings.json"),"Private files included");
        await TwoComputers(root,library,publisher,fake);
        await ProjectScope(root,library);
        File.WriteAllText(report,JsonSerializer.Serialize(new{ok=true,atomic=true,idempotent=true,manifestChecksums=true,remoteOnlyRetained=true,localConflict=true,remoteConflict=true,interruptedUpload=true,concurrentCommit=true,tokenNotPersisted=true,credentialsExcluded=true,twoComputers=true,pullKeepsOfflineEdits=true,conflictChoices=true,conflictBackup=true,baselineSurvivesRestart=true,firstLinkConflict=true,editDuringUpload=true,projectScope=true,sourceConflicts=true,sourceBackup=true,dataIsolated=true,buildArtifactsExcluded=true,sourcesNotExecuted=true},new JsonSerializerOptions{WriteIndented=true}));
    }
    static JsonObject Settings()=>new(){["owner"]="test",["repo"]="songs",["branch"]="main",["folder"]="data",["token"]="TEST-TOKEN"};
    static void CopyLibrary(string from,string to,bool state=true){Directory.CreateDirectory(to);foreach(var f in Directory.EnumerateFiles(from,"*",SearchOption.AllDirectories)){var rel=Path.GetRelativePath(from,f);if(rel.StartsWith(".backups")||(!state&&rel.StartsWith(".sync")))continue;var dst=Path.Combine(to,rel);Directory.CreateDirectory(Path.GetDirectoryName(dst)!);File.Copy(f,dst,true);}}
    static void Edit(string file,string value){var song=JsonNode.Parse(File.ReadAllBytes(file))!;song["syncTest"]=value;File.WriteAllBytes(file,SyncComparison.Bytes(song));}
    static string ReadMark(string file)=>S(JsonNode.Parse(File.ReadAllBytes(file)),"syncTest");
    static async Task<JsonObject> Check(GithubPublisher p)=>Obj(await p.Handle("check",new(),true));
    static async Task<JsonObject> Apply(GithubPublisher p,string action,JsonObject plan,JsonObject? choices=null)=>Obj(await p.Handle(action,new JsonObject{["planId"]=S(plan,"planId"),["choices"]=choices??new JsonObject()},true));
    static async Task TwoComputers(string root,string a,GithubPublisher pa,FakeGitHub fake)
    {
        await Apply(pa,"publish",await Check(pa));
        var b=Path.Combine(root,"PC-B");CopyLibrary(a,b);
        var pref=Path.Combine(root,"b-preferences.json");var pb=new GithubPublisher(new LibraryStore(b),b,fake,pref);await pb.Handle("settings",Settings(),true);
        var a1=Directory.GetFiles(Path.Combine(a,"songs"))[0];var a2=Directory.GetFiles(Path.Combine(a,"songs"))[1];
        var b1=Path.Combine(b,"songs",Path.GetFileName(a1));var b2=Path.Combine(b,"songs",Path.GetFileName(a2));var key1="songs/"+Path.GetFileName(a1);
        Edit(a1,"A1");await Apply(pa,"publish",await Check(pa));
        var plan=await Check(pb);Assert(plan["downloads"]!.GetValue<int>()>0&&plan["conflicts"]!.GetValue<int>()==0,"Remote edit not classified as download");
        var pushes=fake.Patches;await Apply(pb,"download",plan);Assert(fake.Patches==pushes&&ReadMark(b1)=="A1","Pull changed GitHub or missed remote data");
        Edit(b2,"B-offline");Edit(a1,"A2");await Apply(pa,"publish",await Check(pa));
        plan=await Check(pb);Assert(plan["conflicts"]!.GetValue<int>()==0&&plan["uploads"]!.GetValue<int>()>0&&plan["downloads"]!.GetValue<int>()>0,"Independent offline edits conflicted");
        await Apply(pb,"download",plan);Assert(ReadMark(b1)=="A2"&&ReadMark(b2)=="B-offline","Pull lost local edits");
        plan=await Check(pb);Assert(plan["conflicts"]!.GetValue<int>()==0,"Pull acknowledged local edits incorrectly");await Apply(pb,"publish",plan);
        await Apply(pa,"download",await Check(pa));Assert(ReadMark(a2)=="B-offline","Second computer changes missing");
        Edit(a1,"A3");Edit(b1,"B3");await Apply(pa,"publish",await Check(pa));plan=await Check(pb);
        Assert(plan["conflicts"]!.GetValue<int>()==1,"Simultaneous same-file edits not a conflict");
        await Fails(()=>pb.Handle("publish",new JsonObject{["planId"]=S(plan,"planId")},true),"unresolved conflict");Assert(ReadMark(b1)=="B3","Unresolved conflict overwritten");
        var preview=Obj(await pb.Handle("preview",new JsonObject{["planId"]=S(plan,"planId"),["path"]=key1},true));Assert(S(preview,"local").Contains("B3")&&S(preview,"remote").Contains("A3"),"Conflict preview wrong");
        await Apply(pb,"download",plan,new JsonObject{[key1]="remote"});Assert(ReadMark(b1)=="A3","Remote choice ignored");
        Assert(Directory.EnumerateFiles(Path.Combine(b,".backups"),Path.GetFileName(b1),SearchOption.AllDirectories).Any(f=>File.ReadAllText(f).Contains("B3")),"Overwritten conflict not backed up");
        Edit(a1,"A4");Edit(b1,"B4");await Apply(pa,"publish",await Check(pa));plan=await Check(pb);
        await Apply(pb,"publish",plan,new JsonObject{[key1]="local"});Assert(S(JsonNode.Parse(fake.Read("data/"+key1)),"syncTest")=="B4","Local choice ignored");
        await Apply(pa,"download",await Check(pa));
        pb=new GithubPublisher(new LibraryStore(b),b,fake,pref);await pb.Handle("settings",Settings(),true);plan=await Check(pb);Assert(plan["changes"]!.AsArray().Count==0,"Baseline lost after restart");
        var c=Path.Combine(root,"PC-C");CopyLibrary(a,c,false);var c1=Path.Combine(c,"songs",Path.GetFileName(a1));Edit(c1,"Unknown-old-version");
        var pc=new GithubPublisher(new LibraryStore(c),c,fake,Path.Combine(root,"c-preferences.json"));await pc.Handle("settings",Settings(),true);plan=await Check(pc);
        Assert(plan["firstSync"]!.GetValue<bool>()&&plan["conflicts"]!.GetValue<int>()>0,"First link silently chose version");await Apply(pc,"download",plan,new JsonObject{[key1]="remote"});Assert(ReadMark(c1)=="B4","First link resolution failed");
        Edit(a1,"Before-upload");plan=await Check(pa);fake.OnBlob=()=>Edit(a1,"During-upload");var outcome=await Apply(pa,"publish",plan);
        Assert(outcome["localApplied"]!.GetValue<bool>()==false&&ReadMark(a1)=="During-upload","Concurrent local edit lost");
        Assert(S(JsonNode.Parse(fake.Read("data/"+key1)),"syncTest")=="Before-upload","Uploaded snapshot changed mid-flight");
    }
    static async Task ProjectScope(string root,string data)
    {
        var app=Path.Combine(root,"AppSources");Directory.CreateDirectory(Path.Combine(app,"Source","Web"));Directory.CreateDirectory(Path.Combine(app,"Licenses"));
        void Put(string path,string text){var full=Path.Combine(app,path.Replace('/',Path.DirectorySeparatorChar));Directory.CreateDirectory(Path.GetDirectoryName(full)!);File.WriteAllText(full,text);}
        Put("Source/Web/app.js","new local source");Put("Source/Desktop/Program.cs","class SourceTest {}");Put("Licenses/test.txt","license");
        Put("Zpevnik.exe","EXE unchanged");Put("settings.json","personal settings");Put("Source/Desktop/bin/not-source.cs","build output");Put("Source/Desktop/obj/asset.json","temporary");Put("Source/Desktop/web.zip","build archive");Put("Source/Web/.env","SECRET");Put("Source/Web/node_modules/ignored.js","dependency");
        var fake=new FakeGitHub();fake.Add("Source/Web/app.js",Encoding.UTF8.GetBytes("old remote source"));fake.Add("Licenses/test.txt",Encoding.UTF8.GetBytes("license"));
        fake.Add("Source/Desktop/remote.ps1",Encoding.UTF8.GetBytes("throw 'Must not execute'"));
        fake.Add("Source/Desktop/bin/remote.cs",Encoding.UTF8.GetBytes("remote build output"));fake.Add("data/songs/remote.json",Encoding.UTF8.GetBytes("remote data unchanged"));
        var library=new LibraryStore(data);var before=library.PublishSnapshot();
        var p=new GithubPublisher(library,data,fake,Path.Combine(root,"project-preferences.json"),app);await p.Handle("settings",Settings(),true);
        async Task<JsonObject> CheckProject()=>Obj(await p.Handle("check",new JsonObject{["scope"]="project"},true));
        var plan=await CheckProject();Assert(S(plan,"scope")=="project"&&S(plan,"target").EndsWith("/Source + /Licenses"),"Wrong project target");
        Assert(plan["conflicts"]!.GetValue<int>()==1,"Source first-link conflict missing");
        Assert(plan["changes"]!.AsArray().All(e=>!S(e,"path").Contains("bin/")&&!S(e,"path").Contains("obj/")&&!S(e,"path").Contains(".env")&&!S(e,"path").Contains("node_modules")),"Excluded source files listed");
        var preview=Obj(await p.Handle("preview",new JsonObject{["planId"]=S(plan,"planId"),["path"]="Source/Web/app.js"},true));Assert(preview["isJson"]!.GetValue<bool>()&&S(preview,"local")=="new local source","Source text preview missing");
        await Fails(()=>p.Handle("publish",new JsonObject{["planId"]=S(plan,"planId")},true),"source conflict unresolved");
        await Apply(p,"publish",plan,new JsonObject{["Source/Web/app.js"]="local"});
        Assert(Encoding.UTF8.GetString(fake.Read("Source/Web/app.js"))=="new local source"&&fake.Files.ContainsKey("Source/Desktop/Program.cs"),"Source not published at root");
        Assert(!fake.Files.ContainsKey("data/Source/Web/app.js")&&!fake.Files.ContainsKey("manifest.json"),"Source polluted data prefix or root manifest");
        Assert(GithubPublisher.Same(before,library.PublishSnapshot())&&Encoding.UTF8.GetString(fake.Read("data/songs/remote.json"))=="remote data unchanged","Project operation changed Data");
        Assert(File.ReadAllText(Path.Combine(app,"Zpevnik.exe"))=="EXE unchanged"&&File.ReadAllText(Path.Combine(app,"settings.json"))=="personal settings","EXE or settings changed");
        Assert(File.Exists(Path.Combine(app,"Source","Desktop","remote.ps1"))&&!File.Exists(Path.Combine(app,"Source","Desktop","bin","remote.cs")),"Source retrieval or filter failed");
        plan=await CheckProject();Assert(plan["changes"]!.AsArray().Count==0,"Project sync not idempotent");
        fake.Add("Source/Web/app.js",Encoding.UTF8.GetBytes("remote update"));fake.Advance();plan=await CheckProject();var patches=fake.Patches;
        await Apply(p,"download",plan);Assert(File.ReadAllText(Path.Combine(app,"Source","Web","app.js"))=="remote update"&&fake.Patches==patches,"Project download wrote remote or missed source");
        Assert(Directory.EnumerateFiles(Path.Combine(app,".backups"),"app.js",SearchOption.AllDirectories).Any(f=>File.ReadAllText(f)=="new local source"),"Source backup missing");
        plan=await CheckProject();Put("Source/Web/app.js","edit after compare");await Fails(()=>p.Handle("download",new JsonObject{["planId"]=S(plan,"planId")},true),"project stale snapshot");
        Assert(!ProjectFiles.Managed("Source/../outside.cs")&&!ProjectFiles.Managed("Source/Desktop/Zpevnik.exe")&&!ProjectFiles.Managed("settings.json"),"Unsafe project path accepted");
    }
    static async Task Fails(Func<Task<object>> work,string label){try{await work();}catch{return;}throw new Exception("Expected rejection: "+label);}
    sealed class FakeGitHub:HttpMessageHandler
    {
        public Dictionary<string,string> Files=new(StringComparer.Ordinal);
        readonly Dictionary<string,byte[]> blobs=new();readonly Dictionary<string,Dictionary<string,string>> trees=new();readonly Dictionary<string,(string tree,string parent)> commits=new();
        public string Head="head0";public int Patches;public bool FailBlob,RaceOnPatch;public Action? OnBlob;int serial;
        public void Add(string p,byte[] b){var sha=GithubPublisher.BlobHash(b);blobs[sha]=b;Files[p]=sha;}
        public byte[] Read(string p)=>blobs[Files[p]];
        public void Advance(){Head="external"+(++serial);}
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken)
        {
            var path=request.RequestUri!.AbsolutePath.Split("/repos/test/songs/")[1];var method=request.Method.Method;
            var body=request.Content==null?new JsonObject():JsonNode.Parse(await request.Content.ReadAsStringAsync(cancellationToken))!;
            object result;
            if(method=="GET"&&path=="git/ref/heads/main") result=new{ @object=new{sha=Head}};
            else if(method=="GET"&&path.StartsWith("git/commits/")){trees["current"]=new(Files);result=new{tree=new{sha="current"}};}
            else if(method=="GET"&&path=="git/trees/current") result=new{truncated=false,tree=Files.Select(e=>new{path=e.Key,type="blob",mode="100644",sha=e.Value,size=blobs[e.Value].Length})};
            else if(method=="GET"&&path.StartsWith("git/blobs/"))result=new{encoding="base64",content=Convert.ToBase64String(blobs[path[10..]])};
            else if(method=="POST"&&path=="git/blobs") {if(FailBlob)return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);var hook=OnBlob;OnBlob=null;hook?.Invoke();var b=Convert.FromBase64String(S(body,"content"));var sha=GithubPublisher.BlobHash(b);blobs[sha]=b;result=new{sha};}
            else if(method=="POST"&&path=="git/trees") {var entries=new Dictionary<string,string>(trees[S(body,"base_tree")]);foreach(var e in body["tree"]!.AsArray())entries[S(e,"path")]=S(e,"sha");var sha="tree"+(++serial);trees[sha]=entries;result=new{sha};}
            else if(method=="POST"&&path=="git/commits"){var sha="commit"+(++serial);commits[sha]=(S(body,"tree"),body["parents"]![0]!.GetValue<string>());result=new{sha};}
            else if(method=="PATCH"&&path=="git/refs/heads/main") {Assert(body["force"]!.GetValue<bool>()==false,"Force push");if(RaceOnPatch)Advance();var sha=S(body,"sha");if(commits[sha].parent!=Head)return new HttpResponseMessage(HttpStatusCode.UnprocessableEntity);Files=new(trees[commits[sha].tree]);Head=sha;Patches++;result=new{ @object=new{sha}};}
            else throw new Exception("Unexpected fake API: "+method+" "+path);
            return new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent(JsonSerializer.Serialize(result))};
        }
    }
}
