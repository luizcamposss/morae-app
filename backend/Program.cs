using backend.Converters;
using backend.Data;
using backend.Models;
using backend.Seeders;
using backend.Services.Documents;
using backend.Services.Email;
using backend.Services.Maintenance;
using backend.Services.Visits;
using backend.Services.Storage;
using backend.Services.Jobs;
using backend.Settings;
using System.Net;
using System.Threading.RateLimiting;
using backend.Constants;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using dotenv.net;
using backend.Profiles;
using backend.Services.Auth;
using backend.Services.Condominium;
using backend.Services.Buildings;
using backend.Services.Units;
using backend.Services.Persons;
using backend.Services.PersonUnits;
using backend.Middlewares;
using backend.Services.Invitations;
using backend.Services.Permissions;
using backend.Services.UserCondominiumPermissions;
using backend.Services.UserCondominiumAccess;
using backend.Services.News;
using backend.Services.Charges;
using backend.Services.Me;
using backend.Services.Payments;
using backend.Services.Delinquency;
using backend.Services.Occurrences;
using backend.Services.FinancialAccounts;
using backend.Services.Notifications;
using backend.Services.MercadoPago;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter()));

builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            // The refresh-token cookie must travel with /api/auth requests.
            .AllowCredentials();
    });
});

builder.Services.Configure<MercadoPagoSettings>(
    builder.Configuration.GetSection("MercadoPago")
);

builder.Services.Configure<AppSettings>(
    builder.Configuration.GetSection("App")
);

builder.Services.Configure<StorageSettings>(
    builder.Configuration.GetSection("Storage")
);

builder.Services.Configure<ResendSettings>(
    builder.Configuration.GetSection("Resend")
);

// E-mails go through an in-memory queue and are sent by a background worker,
// so requests never wait for Resend and a Resend outage never breaks an action.
builder.Services.AddSingleton<EmailQueue>();
builder.Services.AddSingleton<IEmailQueue>(provider => provider.GetRequiredService<EmailQueue>());
builder.Services.AddSingleton<IEmailSender, ResendEmailSender>();
builder.Services.AddHostedService<EmailBackgroundService>();
builder.Services.AddScoped<IChargeEmailNotifier, ChargeEmailNotifier>();
builder.Services.AddScoped<IInvitationEmailNotifier, InvitationEmailNotifier>();

// Hourly routine: overdue charges, expired invitations, cleanup and daily charge and maintenance reminders.
builder.Services.AddScoped<IScheduledTasks, ScheduledTasks>();
builder.Services.AddHostedService<ScheduledJobsService>();

var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName("morae");

var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];

if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddIdentity<ApplicationUser, IdentityRole<int>>(options =>
{
    // New passwords: at least 8 characters with a digit and a letter (LetterPasswordValidator).
    // Existing passwords keep working; the rule only applies when a password is set.
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;

    // 5 wrong passwords lock the account for 15 minutes (slows down password guessing).
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders()
    .AddPasswordValidator<LetterPasswordValidator>()
    .AddErrorDescriber<PortugueseIdentityErrorDescriber>();

// Password-reset links ("Esqueci minha senha") expire after 1 hour.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
    options.TokenLifespan = TimeSpan.FromHours(1));

builder.Services.AddAutoMapper(
    typeof(ChargeProfile),
    typeof(CondominiumProfile),
    typeof(BuildingProfile),
    typeof(UnitProfile),
    typeof(PersonProfile),
    typeof(PersonUnitProfile),
    typeof(InvitationProfile),
    typeof(NewsProfile),
    typeof(NotificationProfile),
    typeof(MercadoPagoProfile),
    typeof(OccurrenceProfile),
    typeof(UserCondominiumAccessProfile));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBuildingService, BuildingService>();
builder.Services.AddScoped<IChargeService, ChargeService>();
builder.Services.AddScoped<ICondominiumService, CondominiumService>();
builder.Services.AddScoped<IDelinquencyService, DelinquencyService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IMeService, MeService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IPkceService, PkceService>();
builder.Services.AddScoped<IMercadoPagoOAuthClient, MercadoPagoOAuthClient>();
builder.Services.AddScoped<IMercadoPagoPaymentClient, MercadoPagoPaymentClient>();
builder.Services.AddScoped<IMercadoPagoWebhookValidator, MercadoPagoWebhookValidator>();
builder.Services.AddSingleton<IMercadoPagoTokenProtector, MercadoPagoTokenProtector>();
builder.Services.AddScoped<IMercadoPagoService, MercadoPagoService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IFinancialAccountService, FinancialAccountService>();
builder.Services.AddScoped<IPersonService, PersonService>();
builder.Services.AddScoped<IPersonUnitService, PersonUnitService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IOccurrenceService, OccurrenceService>();
builder.Services.AddScoped<IUnitService, UnitService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IMaintenancePlanService, MaintenancePlanService>();
builder.Services.AddScoped<IMaintenanceReminderService, MaintenanceReminderService>();
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<IUserCondominiumPermissionService, UserCondominiumPermissionService>();
builder.Services.AddScoped<IUserCondominiumAccessService, UserCondominiumAccessService>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' not configured");
}

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    opts.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    );
});

var jwtSecret = builder.Configuration["Jwt:Secret"];

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("JWT Secret not configured");
}

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt")
);

var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSecret!)
        ),

        // Default tolerance is 5 minutes, too long for 15-minute access tokens.
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

// Behind a reverse proxy (Caddy in production, ngrok in dev) the client IP comes in
// X-Forwarded-For. Only proxies we trust may set it: loopback by default, plus the networks
// listed in ForwardedHeaders:KnownNetworks (e.g. the Docker network in production).
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    var knownNetworks = builder.Configuration["ForwardedHeaders:KnownNetworks"];

    foreach (var network in (knownNetworks ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        var parts = network.Split('/');
        options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse(parts[0]), int.Parse(parts[1])));
    }
});

// Per-IP limits: anonymous endpoints get strict policies (password guessing, invitation-token
// guessing, floods); everything else shares a generous global limit.
builder.Services.AddRateLimiter(options =>
{
    static string ClientIp(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    static RateLimitPartition<string> PerIpPerMinute(HttpContext context, int permitLimit) =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => PerIpPerMinute(context, 300));
    options.AddPolicy(RateLimitPolicies.Login, context => PerIpPerMinute(context, 10));
    options.AddPolicy(RateLimitPolicies.Refresh, context => PerIpPerMinute(context, 30));
    options.AddPolicy(RateLimitPolicies.Invitation, context => PerIpPerMinute(context, 10));
    options.AddPolicy(RateLimitPolicies.PasswordReset, context => PerIpPerMinute(context, 5));
    options.AddPolicy(RateLimitPolicies.PasswordResetConfirm, context => PerIpPerMinute(context, 10));
    options.AddPolicy(RateLimitPolicies.Webhook, context => PerIpPerMinute(context, 120));

    options.OnRejected = async (rejection, cancellationToken) =>
    {
        rejection.HttpContext.Response.ContentType = "application/json";
        await rejection.HttpContext.Response.WriteAsJsonAsync(new
        {
            statusCode = StatusCodes.Status429TooManyRequests,
            message = "Muitas tentativas. Aguarde um minuto e tente novamente."
        }, cancellationToken);
    };
});

var app = builder.Build();

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseMiddleware<ExceptionMiddleware>();

app.UseRouting();

app.UseCors("FrontendPolicy");

app.UseRateLimiter();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    await IdentitySeeder.SeedRolesAsync(roleManager);
    await IdentitySeeder.SeedMasterAsync(db, userManager, configuration);
}

app.Run();
