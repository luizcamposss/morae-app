# MORAE - Project Context for AI Assistants

## Overview

MORAE is a condominium management platform developed as an ASP.NET Core Web API.

The application is being built as a multi-condominium backend, where users can
belong to one or more condominiums and their capabilities depend on both global
roles and condominium-specific access.

Current stack:

* ASP.NET Core 8
* Entity Framework Core
* MySQL
* ASP.NET Identity
* JWT Authentication
* AutoMapper
* Swagger

The project follows a layered architecture. Controllers must stay thin and all
business rules must remain inside services.

Frontend stack currently in use:

* React 19
* TypeScript
* Vite
* Tailwind CSS 4
* React Router DOM

The frontend is evolving from a static UI prototype into a real application
connected to the backend. Prefer adapting existing screens instead of replacing
them.

---

# Working Mode With The Developer

Important collaboration rules for this repository:

* The developer wants to learn and usually prefers to write the code.
* The assistant should act primarily as a copilot/guide.
* Prefer explaining the reason for each change and suggesting small steps.
* Keep answers short and practical unless deeper explanation is requested.
* Prefer module-by-module progress.
* At the end of each meaningful module, suggest a branch name and a commit.
* Before suggesting frontend changes, inspect the existing files instead of
  assuming the structure.
* Respect the current architecture rather than proposing large rewrites.

Current working style used in this project:

1. Read the current code first.
2. Explain the goal of the module.
3. Suggest small file-level changes.
4. Review what the developer changed.
5. Only edit files directly when explicitly allowed.

---

# Product Model

The main hierarchy is:

```text
Master -> Admin -> Syndic -> Resident
```

Portuguese domain names:

* `Master`: system/platform administrator.
* `Admin`: condominium administrator.
* `Syndic`: syndic/manager delegated by the condominium admin.
* `Resident`: morador/final user.

The application manages:

* Condominiums.
* Buildings/towers/blocks.
* Units/apartments.
* Persons.
* Person-unit relationships.
* Users.
* Invitations.
* User access to condominiums.
* Condominium-specific permissions.

Future modules such as news, charges, payments, delinquency and occurrences must
follow the same access-control model.

---

# Current Project Shape

Although the code currently lives inside a single `backend` project, keep the
logical separation below.

The repository also contains a `frontend` application. The backend remains the
source of truth for authorization and business rules. The frontend should mirror
those concepts for UX, but must not become the only protection layer.

## API Layer

Current location:

```text
backend/Controllers
backend/Program.cs
backend/Middlewares
backend/Settings
```

Responsibilities:

* Controllers.
* Authentication configuration.
* JWT configuration.
* Dependency Injection.
* Swagger.
* Exception middleware.

Rules:

* Controllers must never access `AppDbContext` directly.
* Controllers must only communicate with services.
* Controllers must receive and return DTOs.
* Controllers should not contain business logic.
* Controllers may extract the current authenticated user id from claims and pass
  it to services.

Current user id extraction pattern:

```csharp
var userId = int.Parse(
    User.FindFirstValue(ClaimTypes.NameIdentifier)!
);
```

## Application Layer

Current location:

```text
backend/Services
backend/DTOs
backend/Profiles
backend/Exceptions
```

Responsibilities:

* Services.
* Interfaces.
* DTOs.
* AutoMapper profiles.
* Business rules.
* Permission checks.
* Meaningful domain/application exceptions.

Rules:

* All business logic must be implemented here.
* Services validate permissions before reading or mutating protected data.
* Services throw custom exceptions such as `ForbiddenException`,
  `NotFoundException`, `ConflictException` and `BadRequestException`.
* Services persist through `AppDbContext`.
* Services map entities to response DTOs before returning data.

## Domain Layer

Current location:

```text
backend/Models
backend/Enums
backend/Constants
```

Responsibilities:

* Entities.
* Enums.
* Role constants.
* Permission constants.

Rules:

* Domain classes should not depend on controllers.
* Role names must come from `AppRoles`.
* Permission keys must come from `AppPermissions`.

## Infrastructure Layer

Current location:

```text
backend/Data
backend/Migrations
```

Responsibilities:

* `AppDbContext`.
* Entity Framework relationships.
* Unique constraints.
* Migrations.
* Database access configuration.

## Frontend Layer

Current location:

```text
frontend/src/app
frontend/src/features
frontend/src/shared
```

Responsibilities:

* `app`: router, providers, application bootstrap.
* `features`: feature-specific pages, auth flow, future services/hooks by
  domain.
* `shared`: reusable layout, components, and future shared API helpers.

Current frontend architectural rules:

* Keep pages focused on UI composition and user interaction.
* Do not spread raw `fetch` usage across page components.
* Keep authentication/session logic centralized.
* Prefer role-aware routing and role-aware navigation.
* Backend authorization remains mandatory even if the frontend hides routes.

---

# Authentication

Authentication is based on:

* ASP.NET Identity.
* JWT Bearer Token.

Claims currently used:

```csharp
ClaimTypes.NameIdentifier
ClaimTypes.Email
ClaimTypes.Name
ClaimTypes.Role
```

Login is handled by `AuthController` and `AuthService`.

JWT tokens include one or more role claims from ASP.NET Identity.

Frontend authentication status:

* Login page is connected to the backend.
* JWT token is currently stored in `localStorage`.
* Frontend session is rehydrated through `GET /api/me`.
* Session state is centralized in an auth provider.

---

# Authorization

The system uses two complementary access concepts:

1. Global role through ASP.NET Identity.
2. Condominium access through `UserCondominium`.

Do not rely only on `[Authorize(Roles = "...")]` for data isolation. Role
attributes can block broad categories of users, but condominium isolation must be
validated inside services through `PermissionService`.

## Master

System/platform administrator.

Capabilities:

* Create condominiums.
* Onboard condominiums with an initial admin.
* Manage platform-level condominium records and commercial/contact data.
* Invite condominium admins.
* Contact condominium admins/representatives directly.

Rules:

* Master actions should call `EnsureMasterAsync`.
* Master should not be treated as a condominium member unless explicitly linked.
* Master must not automatically access condominium operations such as
  buildings, units, residents, person-unit links, charges, occurrences or
  condominium-scoped management screens.
* Master may manage global platform/contact people created by that same Master,
  but must not edit condominium residents created/managed by Admin users.
* Operational condominium access belongs to Admin, Syndic and Resident according
  to `UserCondominium` and permission checks.

## Admin

Condominium administrator.

Capabilities:

* Manage only assigned condominiums.
* Manage buildings.
* Manage units.
* Manage residents/persons in assigned condominiums.
* Invite syndics and residents.
* Manage syndic permissions in assigned condominiums.

Rules:

* Admin access to a condominium is represented by `UserCondominium`.
* Admin is powerful only inside condominiums where the user has a
  `UserCondominium` row with role `Admin`.
* Admin should not access another condominium just because the Identity role is
  `Admin`.

## Syndic

Delegated condominium manager.

Capabilities:

* Access assigned condominiums.
* Read condominium data according to service validations.
* Perform specific actions only when allowed by condominium-specific
  permissions.

Rules:

* Syndic access is represented by `UserCondominium`.
* Syndic permissions are represented by `UserCondominiumPermission`.
* New syndic write actions should check `EnsureCondominiumPermissionAsync`.
* Admins have all condominium permissions for the condominiums they administer.
* Syndics only have permissions explicitly stored in
  `UserCondominiumPermission`.

Current permission keys:

```text
news.create
news.edit
charges.create
charges.mark_as_paid
delinquency.view
occurrences.manage
```

## Resident

Morador/final user.

Capabilities:

* Access personal data.
* Access condominium/unit information only when linked through the current access
  model.

Rules:

* Resident should not manage condominium structure.
* Resident access should be restricted to personal data and related units.
* When implementing resident-specific access, prefer explicit service methods
  over controller-side checks.

---

# Access Control Model

The system is evolving from simple role-based access control to condominium
scoped authorization.

## UserCondominium

Purpose:

Represents which condominiums a user can access and which role the user has in
that condominium.

Relationship:

```text
ApplicationUser
  -> UserCondominium
      -> Condominium
```

Business rules:

* A user may belong to multiple condominiums.
* A condominium may have multiple users.
* A user must not have duplicated access to the same condominium.
* The unique key is `UserId + CondominiumId`.
* The role stored in `UserCondominium.Role` defines the user's condominium-level
  responsibility.

## UserCondominiumPermission

Purpose:

Stores granular permissions for a user's condominium access, mainly for
`Syndic` users.

Relationship:

```text
UserCondominium
  -> UserCondominiumPermission
```

Business rules:

* Permissions can only be managed for syndic users.
* Admin users can manage syndic permissions only inside condominiums they
  administer.
* Permission keys must exist in `AppPermissions.All`.
* The unique key is `UserCondominiumId + PermissionKey`.

---

# PermissionService

Purpose:

Centralize all access validations.

No controller should implement permission validation directly.

All access checks must go through `PermissionService`.

Current responsibilities:

```csharp
IsMasterAsync()
IsAdminAsync()
IsSyndicAsync()
IsResidentAsync()

EnsureMasterAsync()
EnsureCondominiumAdminAsync()

HasCondominiumAccessAsync()
HasBuildingAccessAsync()
HasUnitAccessAsync()
HasPersonAccessAsync()

HasCondominiumPermissionAsync()

EnsureCondominiumAccessAsync()
EnsureBuildingAccessAsync()
EnsureUnitAccessAsync()
EnsurePersonAccessAsync()
EnsureCondominiumPermissionAsync()
```

Use `Ensure...` methods when lack of access should stop the operation with a
`ForbiddenException`.

Example:

```csharp
await _permissionService.EnsureCondominiumAccessAsync(
    userId,
    condominiumId
);
```

Example for future syndic permission checks:

```csharp
await _permissionService.EnsureCondominiumPermissionAsync(
    userId,
    condominiumId,
    AppPermissions.NewsCreate
);
```

---

# Main Entities

## Condominium

Represents a condominium.

Relationships:

```text
Condominium
  -> Buildings
  -> UserCondominiums
```

Important rules:

* `CNPJ` must be unique.
* `CreatedByUserId` points to the Master that created the condominium.

## Building

Represents a tower/block.

Relationships:

```text
Condominium
  -> Building
      -> Units
```

Important rules:

* `Code` must be unique inside a condominium.

## Unit

Represents an apartment/unit.

Relationships:

```text
Building
  -> Unit
      -> PersonUnit
```

Important rules:

* `Number` must be unique inside a building.

## Person

Represents a physical person.

Relationships:

```text
Person
  -> ApplicationUser
Person
  -> PersonUnit
```

Important rules:

* `CPF` must be unique.
* A person may exist before the user account is created.
* `CreatedByUserId` stores who created the person.
* Master can update/delete only global people created by that same Master.
* Condominium residents should be managed through condominium-scoped endpoints
  and `PersonCondominium`.

## PersonUnit

Relationship entity that links a person to a unit.

Relationship types:

```text
Owner
Resident
Tenant
```

Important rules:

* The same person cannot have the same relationship type duplicated for the same
  unit.

## Invitation

Represents an invitation to create a user account for an existing person.

Important rules:

* Master can invite only Admin users.
* Admin can invite only Syndic or Resident users.
* Admin can invite users only for condominiums where the admin has
  condominium-admin access.
* Invitations expire.
* Accepting an invitation creates the `ApplicationUser`, assigns the Identity
  role and creates the `UserCondominium` link.

---

# Existing Endpoint Areas

Current controllers:

```text
AuthController
CondominiumController
MyCondominiumsController
BuildingsController
UnitsController
PersonsController
PersonUnitsController
InvitationsController
UserCondominiumPermissionsController
```

Important frontend-connected endpoints currently used:

```text
POST /Auth/login
GET  /api/me
```

Controller guidelines:

* Use route patterns already present in the project.
* Keep nested resources when the parent context matters, for example:

```text
POST /api/condominiums/{condominiumId}/buildings
GET  /api/condominiums/{condominiumId}/buildings
POST /api/buildings/{buildingId}/units
GET  /api/buildings/{buildingId}/units
POST /api/units/{unitId}/persons
GET  /api/units/{unitId}/persons
```

* Use `[Authorize]` for authenticated routes.
* Use role attributes only for broad access gates.
* Always perform condominium/resource access validation in services.

---

# Service Pattern

Every entity service should follow the existing pattern:

```csharp
CreateAsync()
GetAllAsync()
GetByIdAsync()
UpdateAsync()
DeleteAsync()
```

Nested resources may use more specific names:

```csharp
GetByCondominiumAsync()
GetByBuildingAsync()
GetByUnitAsync()
```

Rules:

* Validate the authenticated user.
* Validate parent resources exist.
* Validate access through `PermissionService`.
* Validate uniqueness and business constraints.
* Throw meaningful custom exceptions.
* Use AutoMapper.
* Persist through `AppDbContext`.
* Return DTOs, not entities.

---

# Controller Pattern

Controllers should:

* Receive services through dependency injection.
* Extract the authenticated user id from claims when needed.
* Pass user id and DTOs to services.
* Return DTOs.
* Use `ActionResult<T>` or `IActionResult` consistently with existing files.
* Use `CreatedAtAction` or `Created` when creating resources.

Example:

```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateEntityDto dto)
{
    var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var result = await _service.CreateAsync(userId, dto);

    return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result
    );
}
```

Controllers must not:

* Query `AppDbContext`.
* Implement permission checks directly.
* Return EF entities.
* Duplicate business rules from services.

---

# DTO Rules

Never expose entities directly.

Use:

```text
CreateDto
UpdateDto
ResponseDto
```

Examples:

```text
CreateBuildingDto
UpdateBuildingDto
BuildingResponseDto
```

DTOs should live under:

```text
backend/DTOs/{FeatureName}
```

---

# AutoMapper Rules

All entity mappings must be centralized inside AutoMapper profiles.

Profiles should live under:

```text
backend/Profiles
```

Example:

```csharp
CreateMap<CreateBuildingDto, Building>();
CreateMap<Building, BuildingResponseDto>();
```

When a new profile is added, register it in `Program.cs`.

---

# Database Rules

Current important unique constraints:

```text
Condominium.CNPJ
Building: CondominiumId + Code
Unit: BuildingId + Number
Person.CPF
PersonUnit: PersonId + UnitId + RelationshipType
UserCondominium: UserId + CondominiumId
UserCondominiumPermission: UserCondominiumId + PermissionKey
```

When adding new entities:

* Configure relationships in `AppDbContext`.
* Add indexes/unique constraints when business rules require them.
* Create EF Core migrations.
* Keep delete behavior intentional.

---

# Development Rules

Always:

* Follow existing project patterns.
* Use async/await.
* Use DTOs.
* Use AutoMapper.
* Use dependency injection.
* Keep business logic inside services.
* Centralize permission validation in `PermissionService`.
* Respect the `Master -> Admin -> Syndic -> Resident` hierarchy.
* Keep condominium data isolated by `UserCondominium`.
* Keep frontend route protection aligned with backend roles.
* Prefer reusing the UI screens already created in `frontend/src/features`.

Never:

* Access `AppDbContext` in controllers.
* Return entities directly from controllers.
* Duplicate permission validations.
* Duplicate business rules.
* Add role strings manually when `AppRoles` should be used.
* Add permission strings manually when `AppPermissions` should be used.
* Give Admin access to all condominiums just because the user has the Identity
  role `Admin`.
* Treat frontend route guards as a substitute for backend authorization.

---

# Frontend Current State

The frontend already contains many visual pages and dashboards, but many of them
are still static/mock-driven. The current goal is to make them functional
without rewriting the existing visual foundation.

## Current Frontend Routing

The current router lives in:

```text
frontend/src/app/AppRouter.tsx
```

Implemented route concepts:

* `PublicRoute`: protects public pages from already-authenticated users.
* `ProtectedRoute`: protects authenticated areas.
* `RoleRoute`: protects role-specific route groups.

Current protected route groups:

```text
/master/dashboard
/admin/dashboard
/syndic/dashboard
/resident/dashboard
/resident/settings
```

## Current Frontend Session Architecture

Current auth/session files:

```text
frontend/src/app/providers/AuthContext.ts
frontend/src/app/providers/AuthProvider.tsx
frontend/src/app/providers/useAuth.ts
frontend/src/features/auth/authService.ts
frontend/src/features/auth/authStorage.ts
frontend/src/features/me/meService.ts
```

Current session behavior:

* `LoginPage` logs in through the backend.
* Token is saved using `authStorage`.
* After login, the frontend calls `refreshUser()` from the auth provider.
* `refreshUser()` loads `GET /api/me` and stores the authenticated user in
  memory.
* `PublicRoute` redirects authenticated users to their default dashboard.
* `ProtectedRoute` blocks access without a valid session.
* `RoleRoute` blocks access to route groups outside the user's role.

## Current Frontend Role Navigation

Role-based redirection currently uses:

```text
frontend/src/features/auth/authRedirect.ts
frontend/src/features/auth/roleGuard.ts
frontend/src/features/auth/RoleRoute.tsx
```

The current default route logic is:

```text
Master  -> /master/dashboard
Admin   -> /admin/dashboard
Syndic  -> /syndic/dashboard
Resident -> /resident/dashboard
```

## Current Shared Layout Status

Current layout files:

```text
frontend/src/shared/layout/AppLayout.tsx
frontend/src/shared/layout/Topbar.tsx
frontend/src/shared/layout/Sidebar.tsx
```

Important current behavior:

* `AppLayout` uses `Outlet`.
* `Topbar` already reads the authenticated user from session.
* `Sidebar` is a single modern hover-expand container.
* `Sidebar` already changes visible menu items by primary role.
* `Sidebar` already triggers logout.

## Current Frontend UX Helpers

Current shared loading component:

```text
frontend/src/shared/components/PageLoader.tsx
```

This is already used by route guards during session/permission validation.

---

# Current Implementation Focus

Current focus:

1. Keep the current architecture consistent.
2. Strengthen access validation through `PermissionService`.
3. Finish applying the `Syndic` permission model to future modules.
4. Preserve condominium isolation for Admin, Syndic and Resident users.
5. Add new modules using the same controller-service-DTO-profile pattern.

Current frontend focus:

1. Keep the existing visual design while connecting real data.
2. Strengthen session handling and role-aware navigation.
3. Centralize HTTP access before connecting many pages.
4. Turn existing static screens into real modules gradually.
5. Prefer one working module at a time over broad rewrites.

When implementing new features, first identify:

1. Which role can call the endpoint.
2. Which condominium/resource the action belongs to.
3. Which `PermissionService` method must validate access.
4. Whether a syndic needs a specific `AppPermissions` key.
5. Which DTOs and AutoMapper mappings are needed.

---

# Frontend Modules Roadmap

Modules already implemented or substantially advanced:

1. Frontend foundation
   * Router base
   * Layout with `Outlet`
   * Public and protected route separation

2. Authentication
   * Login integrated with backend
   * Token persistence

3. Session and identity
   * Global auth provider
   * Session rehydration via `GET /api/me`
   * Logout
   * `PublicRoute` and `ProtectedRoute`

4. Role-based routing
   * `RoleRoute`
   * Role-aware redirects
   * Role-aware sidebar/menu

5. API layer
   * Centralize `API_BASE_URL`
   * Create shared API client
   * Centralize auth headers
   * Handle JSON responses and `204 No Content`

6. Application context beyond auth
   * Active condominium provider
   * Persisted active condominium selection
   * Reusable condominium context for operational modules

7. Buildings and units operational modules
   * Buildings page connected to real backend data
   * Building metrics, search, create, edit and detail modal
   * Units page connected to real backend data
   * Unit metrics, search, create, edit, detail and delete flow
   * Unit person-link flow using `PersonUnits`
   * Unit backend response enriched with building, condominium, status and responsible person data
   * Unit deletion blocked when people are linked
   * Person/unit DTO validation strengthened for MVP safety

8. People / residents management
   * Dedicated admin route `/admin/people`
   * Sidebar entry `Moradores` for Admin users
   * People page connected to `GET /api/condominiums/{condominiumId}/persons`
   * Create and edit people inside the active condominium context
   * People response enriched with condominium, unit count and main unit
   * `PersonCondominium` relationship added so people can belong to a condominium before being linked to a unit
   * Unit person-link modal now loads people from the active condominium instead of global `/api/persons`
   * Master remains blocked from condominium operational people/residents endpoints
   * Master global person update/delete now requires `Person.CreatedByUserId` to match the authenticated Master

9. Invitations and access management
   * Backend invitation responses enriched with condominium, role and status display fields
   * `GET /api/condominiums/{condominiumId}/invitations` lists invitations scoped by role and condominium
   * Admin can create and list invitations for `Syndic` and `Resident` in assigned condominiums
   * Admin invitation creation requires the person to belong to the target condominium
   * Master can create and list only `Admin` invitations
   * Master invitation creation requires a global/contact person created by that same Master
   * Public route `/accept-invitation/:token` loads the invitation and accepts it
   * Accepting an invitation creates the `ApplicationUser`, assigns the Identity role and creates `UserCondominium`
   * Admin route `/admin/invitations` lists and creates invitations for the active condominium
   * Master route `/master/invitations` creates admin invitations without giving Master condominium operational access
   * People page action `Preparar convite` now opens the invitation flow with a selected person

10. Master condominium onboarding
   * Master condominium page uses real backend data only
   * New condominium creation now uses `POST /api/condominium/onboarding`
   * Onboarding creates the condominium and the first Admin user in one flow
   * Frontend validates condominium fields, Admin CPF, Admin phone, Admin e-mail and initial password before submit
   * Initial onboarding password policy is simplified for MVP: minimum 6 characters
   * API client now surfaces ASP.NET validation errors from `errors` responses
   * Editing existing condominiums remains limited to institutional condominium data and status

11. Master admin invitations UX
   * Master route `/master/invitations` is connected to real backend data
   * Master selects a real condominium and lists only Admin invitations for it
   * Creating an Admin invitation creates a Master-owned global person, then creates the invitation
   * The created invitation token is transformed into `/accept-invitation/{token}` on the frontend
   * The generated invitation link is shown after creation and can be copied
   * Invitation metrics, search and status filters use backend invitation data only

12. Master users management
   * Master route `/master/users` is connected to real backend data
   * Backend endpoint `GET /api/master/users` lists only Admin users from condominiums created by the authenticated Master
   * Master users page does not show syndic, resident or operational condominium users
   * Master can suspend/reactivate only Admin access for condominiums created by that same Master
   * Existing suspend/reactivate backend flow now validates Master ownership of the condominium before changing access
   * Frontend user metrics, filters and detail modal use backend user access data only

13. Multi-profile frontend functional pass
   * Shared frontend services added for charges, news and occurrences
   * `GET /api/me/units` is now exposed through the frontend `meService`
   * Admin dashboard now aggregates real buildings, units, people, invitations, charges, news and occurrences for the active condominium
   * Syndic dashboard now uses real condominium data available to the logged-in syndic
   * Resident dashboard now uses real user units, charges, occurrences and condominium news
   * Master payments page now lists real platform charges only, preserving the rule that Master cannot see internal condominium operations
   * Admin payments page now lists real condominium charges and can create a condominium charge for a real unit
   * Syndic residents page now lists real people from the active condominium
   * Resident unit, bills and notices pages now use backend data instead of static examples
   * Sidebar navigation was updated with real routes for Admin payments, Syndic residents and Resident unit/bills/notices
   * Sidebar labels were corrected to proper PT-BR accents and `MORAÊ`

14. Platform billing flow
   * Current branch for this module: `feat/platform-billing-flow`
   * Platform charges are condominium debts, not debts tied to one specific Admin user
   * Master can create, list, cancel and manually mark as paid only platform charges from condominiums created by that Master
   * Admin can list platform charges only for condominiums where the user has an active `UserCondominium` row with role `Admin`
   * Admin cannot create platform charges and cannot manually mark platform charges as paid
   * Condominium charges remain operational/internal and are still scoped to Admin/Syndic/Resident access rules
   * `ChargeResponseDto` now returns condominium and unit display data so the frontend does not render raw IDs
   * Pending charges with due dates in the past are returned as `Overdue` in the response mapping
   * Frontend added a payments API service for manual payments
   * Master payments page now creates real platform charges, cancels eligible charges and registers manual payment
   * Admin payments page now separates `Cobranças MORAÊ` from `Cobranças do condomínio`
   * Financial account registration was added for bank account and Pix data
   * Master settings can register the platform receiving bank account and Pix key
   * Admin settings can register the active condominium receiving bank account and Pix key
   * Financial account access follows backend isolation: Master controls platform data; Admin controls only assigned condominium data
   * Migration `AddFinancialAccounts` creates the `FinancialAccounts` table

Modules still planned:

15. UX hardening
   * Better empty states
   * Better error/success feedback
   * Better form validation
   * Better expired-session handling

16. Additional business modules
   * News/communication
   * Delinquency
   * Occurrences

Preferred near-term order:

1. Finish `Módulo 4` testing/commit if not yet committed.
2. Build `Módulo 5: camada de API`.
3. Connect the first real CRUD/module using the shared API layer.

---

# Current Working Point

The previous near-term order has been superseded by the completed frontend/API
work.

Current state:

1. Units module is complete and tested.
2. People/residents module is implemented and tested locally.
3. Current branch for this work is `feat/platform-billing-flow`.
4. Invitations and access management module is implemented and tested locally.
5. Platform billing is being implemented after the multi-profile functional pass.

Latest module 8 validation:

* Frontend build passed with `npm.cmd run build`.
* Backend build passed with `dotnet build backend\backend.csproj /p:UseAppHost=false`.
* Latest backend build can show a warning when `dotnet watch run` is active because `backend.exe` is locked, but compilation still succeeds.
* Admin can list, create and update condominium people.
* Invalid person payload returns `400`.
* Master receives `403` when trying to access condominium-scoped people.
* Migration creates the `PersonCondominiums` table with a unique `PersonId + CondominiumId` index.
* Master can update a global person created by themselves.
* Master receives `403` when trying to update a condominium person created/managed outside the Master scope.
* Admin can still update people inside their assigned condominium.

Latest module 9 validation:

* Frontend build passed with `npm.cmd run build`.
* Backend build passed with `dotnet build backend\backend.csproj /p:UseAppHost=false`.
* Admin can create a `Resident` invitation.
* Admin receives `403` when trying to invite an `Admin`.
* Master can create an `Admin` invitation using a global person created by that Master.
* Master receives `403` when trying to invite a `Resident`.
* Master receives `403` when trying to invite a condominium person outside the Master-owned global contact scope.
* Invitation list by condominium works for Admin and Master.
* Public invitation lookup by token returns person, condominium and role data.
* Invitation acceptance returns `200`, creates login access and creates `UserCondominium`.
* New accepted resident can login and appears in `/api/me/condominiums`.

Latest platform billing validation:

* Frontend build passed with `npm.cmd run build`.
* Backend build passed with `dotnet build backend\backend.csproj /p:UseAppHost=false -o .tmp\backend-build`.
* Normal backend build can fail while `dotnet watch run` is active because `backend.dll` is locked by the running API process.
* Migration `AddFinancialAccounts` was applied to the local database.
* Financial account endpoints require restarting the backend after code changes before testing through `http://localhost:5242`.

---

# Guidance for AI Assistants

When helping with this project:

* Explain the reason for changes before or while implementing them.
* Prefer teaching the developer the pattern instead of only pasting code.
* Keep changes aligned with the current architecture.
* Read the existing service/controller/profile before adding a new feature.
* Make small, coherent changes.
* Update interfaces when services change.
* Register new services and profiles in `Program.cs`.
* Run build or tests when possible.
* If a new feature needs database changes, add a migration and explain why.
* On frontend tasks, prefer guiding the developer step by step.
* Reuse existing pages instead of replacing them unless explicitly requested.
* Keep route/session/role logic centralized.
* When proposing frontend architecture, preserve the current `app/features/shared`
  structure.
* Suggest branch names and commit messages at the end of each module.

The developer wants to code and understand the architecture, not just copy final
snippets.
