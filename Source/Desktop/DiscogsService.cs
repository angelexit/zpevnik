using System.Net.Http;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Text;
namespace Zpevnik;
sealed class DiscogsService {
 readonly HttpClient http;
 public DiscogsService(HttpMessageHandler? handler=null,string? vaultPath=null){http=new HttpClient(handler??new HttpClientHandler{AllowAutoRedirect=false}){Timeout=TimeSpan.FromSeconds(25)};if(vaultPath!=null)vault=vaultPath;}
 readonly SemaphoreSlim gate=new(1,1);
 readonly string vault=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Zpevnik","discogs.token");
 DateTime next=DateTime.MinValue;
 string Token() { try {return File.Exists(vault)?Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(vault),null,DataProtectionScope.CurrentUser)):"";} catch {return "";} }
 static string S(JsonObject b,string k)=>b[k]?.ToString()?.Trim()??"";
 public async Task<object> Handle(string action,JsonObject b,bool write) {
 if(action=="status")return new {hasToken=Token()!=""};
 if(!write)throw new Exception("Použij tlačítko v editoru.");
 if(action=="forget") {if(File.Exists(vault))File.Delete(vault);return new {ok=true};}
 if(action=="connect") {
 var token=S(b,"token");if(token.Length<8||token.Length>256||token.Any(char.IsWhiteSpace))throw new Exception("Vyplň platný osobní token.");
 var identity=await Get("oauth/identity",token);
 Directory.CreateDirectory(Path.GetDirectoryName(vault)!);
 File.WriteAllBytes(vault,ProtectedData.Protect(Encoding.UTF8.GetBytes(token),null,DataProtectionScope.CurrentUser));
 return new {username=identity["username"]?.ToString(),hasToken=true};
 }
 var saved=Token();if(saved=="")throw new Exception("Nejdřív připoj Discogs pomocí tokenu.");
 int Id(){if(!int.TryParse(S(b,"id"),out var id)||id<=0)throw new Exception("Neplatné ID.");return id;}
 int.TryParse(S(b,"page"),out var page);page=Math.Clamp(page,1,10000);
 if(action=="search") {var q=S(b,"query");if(q.Length<2||q.Length>200)throw new Exception("Zadej 2 až 200 znaků.");return await Get("database/search?type=artist&per_page=25&page="+page+"&q="+Uri.EscapeDataString(q),saved);}
 if(action=="albums")return await Get($"artists/{Id()}/releases?sort=year&sort_order=asc&per_page=50&page={page}",saved);
 if(action=="detail")return await Get((S(b,"type")=="master"?"masters/":"releases/")+Id(),saved);
 if(action=="image") {
 // Only image URLs obtained from the selected release are accepted, never caller-supplied URLs.
 var detail=await Get((S(b,"type")=="master"?"masters/":"releases/")+Id(),saved);
 var url=detail["images"]?.AsArray().FirstOrDefault()?["uri"]?.ToString();
 if(!Uri.TryCreate(url,UriKind.Absolute,out var uri)||uri.Scheme!="https"||!(uri.Host=="i.discogs.com"||uri.Host=="img.discogs.com"))throw new Exception("Obal není dostupný.");
 using var req=new HttpRequestMessage(HttpMethod.Get,uri);req.Headers.UserAgent.ParseAdd("Zpevnik/3.1.30");
 using var res=await http.SendAsync(req,HttpCompletionOption.ResponseHeadersRead);res.EnsureSuccessStatusCode();
 if(res.Content.Headers.ContentLength>10000000)throw new Exception("Obal je příliš velký.");
 using var stream=await res.Content.ReadAsStreamAsync();using var memory=new MemoryStream();var buffer=new byte[8192];int count;
 while((count=await stream.ReadAsync(buffer))>0){if(memory.Length+count>10000000)throw new Exception("Obal je příliš velký.");memory.Write(buffer,0,count);}
 var mime=res.Content.Headers.ContentType?.MediaType??"";if(!new[]{"image/jpeg","image/png","image/webp"}.Contains(mime))throw new Exception("Nepodporovaný obrázek.");
 return new {data="data:"+mime+";base64,"+Convert.ToBase64String(memory.ToArray())};
 }
 throw new Exception("Neznámá operace.");
 }
 async Task<JsonObject> Get(string path,string token) {
 await gate.WaitAsync();try {
 var delay=next-DateTime.UtcNow;if(delay>TimeSpan.Zero)await Task.Delay(delay);
 using var req=new HttpRequestMessage(HttpMethod.Get,"https://api.discogs.com/"+path);
 req.Headers.UserAgent.ParseAdd("Zpevnik/3.1.30");req.Headers.TryAddWithoutValidation("Authorization","Discogs token="+token);
 req.Headers.Accept.ParseAdd("application/vnd.discogs.v2.plaintext+json");
 using var res=await http.SendAsync(req);next=DateTime.UtcNow.AddMilliseconds(1100);
 if((int)res.StatusCode==429){next=DateTime.UtcNow.AddSeconds(60);throw new Exception("Limit Discogs byl vyčerpán. Zkus to za minutu.");}
 if(res.Headers.TryGetValues("X-Discogs-Ratelimit-Remaining",out var values)&&double.TryParse(values.FirstOrDefault(),out var remaining)&&remaining<1)next=DateTime.UtcNow.AddSeconds(60);
 if(!res.IsSuccessStatusCode)throw new Exception((int)res.StatusCode switch {401=>"Token není platný.",403=>"Discogs odmítl přístup. Ověř token a zkus to později.",404=>"Záznam nebyl nalezen.",_=>"Discogs není dostupný ("+(int)res.StatusCode+")."});
 return JsonNode.Parse(await res.Content.ReadAsStringAsync())!.AsObject();
 }catch(TaskCanceledException){throw new Exception("Discogs neodpověděl včas.");}catch(HttpRequestException){throw new Exception("Připojení k Discogs se nezdařilo.");}finally{gate.Release();}
 }
}
