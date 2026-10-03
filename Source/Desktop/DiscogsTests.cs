using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
namespace Zpevnik;
static class DiscogsTests {
 sealed class Fake : HttpMessageHandler {
 public List<string> Paths=new();public bool Deny;
 protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req,CancellationToken ct){
 if(req.RequestUri!.Host!="api.discogs.com"||req.Headers.UserAgent.ToString()!="Zpevnik/3.1.30"||req.Headers.GetValues("Authorization").Single()!="Discogs token=fake-test-token")throw new Exception("Request headers");
 Paths.Add(req.RequestUri.PathAndQuery);
 return Task.FromResult(new HttpResponseMessage(Deny?HttpStatusCode.Unauthorized:HttpStatusCode.OK){Content=new StringContent(req.RequestUri.AbsolutePath=="/oauth/identity"?"{\"username\":\"test\"}":"{\"results\":[],\"releases\":[],\"title\":\"Amsterdam\"}")});
 }
 }
 public static async Task Run(string folder){Directory.CreateDirectory(folder);var vault=Path.Combine(folder,"test.token");var fake=new Fake();var service=new DiscogsService(fake,vault);
 await service.Handle("connect",new JsonObject{["token"]="fake-test-token"},true);
 if(System.Text.Encoding.UTF8.GetString(File.ReadAllBytes(vault)).Contains("fake-test-token"))throw new Exception("Plain token");
 await service.Handle("search",new JsonObject{["query"]="Ilona Csáková"},true);
 await service.Handle("albums",new JsonObject{["id"]=42,["page"]=2},true);
 await service.Handle("detail",new JsonObject{["id"]=127620,["type"]="master"},true);
 if(!fake.Paths.Any(p=>p.Contains("artists/42/releases")&&p.Contains("page=2"))||!fake.Paths.Contains("/masters/127620"))throw new Exception("Paths");
 fake.Deny=true;try{await service.Handle("search",new JsonObject{["query"]="test"},true);throw new Exception("Expected rejection");}catch(Exception e)when(e.Message=="Token není platný."){}
 await service.Handle("forget",new JsonObject(),true);if(File.Exists(vault))throw new Exception("Forget");
 }
}
