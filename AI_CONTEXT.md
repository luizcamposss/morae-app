# MORAE - Project Context for AI Assistants

## Overview

MORAE is a condominium management platform developed using ASP.NET Core Web API.

Current stack:

* ASP.NET Core 9
* Entity Framework Core
* MySQL
* ASP.NET Identity
* JWT Authentication
* AutoMapper
* Swagger

The project follows a layered architecture and business rules must remain separated from controllers.

---

# Architecture

## Morae.API

Responsibilities:

* Controllers
* Authentication configuration
* JWT configuration
* Dependency Injection
* Swagger

Rules:

* Controllers must never access DbContext directly.
* Controllers must only communicate with Services.
* Controllers must return DTOs.
* Controllers should not contain business logic.

---

## Morae.Application

Responsibilities:

* Services
* DTOs
* Interfaces
* AutoMapper Profiles
* Business Rules

All business logic must be implemented here.

---

## Morae.Domain

Responsibilities:

* Entities
* Enums
* Domain Models

Domain classes should not depend on infrastructure.

---

## Morae.Infrastructure

Responsibilities:

* ApplicationDbContext
* Entity Framework Configurations
* Migrations
* Database Access

---

# Authentication

Authentication is based on:

* ASP.NET Identity
* JWT Bearer Token

Claims currently used:

```csharp
ClaimTypes.NameIdentifier
ClaimTypes.Email
ClaimTypes.Role
```

User Id extraction pattern:

```csharp
var userId = int.Parse(
    User.FindFirstValue(ClaimTypes.NameIdentifier)!
);
```

---

# Authorization

Current roles:

```text
Master
Admin
Resident
```

## Master

System administrator.

Capabilities:

* Full system access
* Create condominiums
* Manage all entities

## Admin

Condominium administrator.

Capabilities:

* Manage only assigned condominiums
* Manage buildings
* Manage units
* Manage residents

## Resident

Final user.

Capabilities:

* Access only personal data
* Access only assigned condominium information

---

# Main Entities

## Condominium

Represents a condominium.

Relationships:

```text
Condominium
 └── Buildings
```

---

## Building

Represents a tower/block.

Relationships:

```text
Building
 └── Units
```

Belongs to:

```text
Condominium
```

---

## Unit

Represents an apartment/unit.

Relationships:

```text
Unit
 └── PersonUnit
```

Belongs to:

```text
Building
```

---

## Person

Represents a person.

Relationships:

```text
Person
 └── PersonUnit

Person
 └── ApplicationUser
```

---

## PersonUnit

Relationship entity.

Purpose:

Links a Person to a Unit.

Relationship types:

```text
Owner
Resident
Tenant
```

---

# Access Control Strategy

The system is evolving from role-based access to permission-based access.

Roles define general capabilities.

Permissions define access to specific condominiums.

Example:

An Admin should only access the condominiums assigned to him.

---

# UserCondominium

Purpose:

Represents which condominiums a user can access.

Example:

```text
ApplicationUser
 └── UserCondominium
         └── Condominium
```

Business Rule:

A user may belong to multiple condominiums.

A condominium may have multiple users.

---

# PermissionService

Purpose:

Centralize all access validations.

No controller should implement permission validation directly.

All access checks must go through PermissionService.

Example:

```csharp
await _permissionService
    .HasCondominiumAccessAsync(
        userId,
        condominiumId
    );
```

Future methods:

```csharp
HasCondominiumAccessAsync()

HasBuildingAccessAsync()

HasUnitAccessAsync()

HasPersonAccessAsync()
```

---

# Service Pattern

Every entity service should follow:

```csharp
CreateAsync()

GetAllAsync()

GetByIdAsync()

UpdateAsync()

DeleteAsync()
```

Rules:

* Validate business rules
* Throw meaningful exceptions
* Use AutoMapper
* Persist through DbContext

---

# Controller Pattern

Controllers should:

* Receive services via DI
* Return DTOs
* Use ActionResult<T>
* Use CreatedAtAction when creating resources

Example:

```csharp
[HttpPost]
public async Task<ActionResult<EntityResponseDto>>
Create(CreateEntityDto dto)
{
    var result = await _service.CreateAsync(dto);

    return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result
    );
}
```

---

# DTO Rules

Never expose entities directly.

Always use:

```text
CreateDto
UpdateDto
ResponseDto
```

Example:

```text
CreateBuildingDto
UpdateBuildingDto
BuildingResponseDto
```

---

# AutoMapper Rules

All entity mappings must be centralized inside AutoMapper Profiles.

Example:

```csharp
CreateMap<CreateBuildingDto, Building>();

CreateMap<Building, BuildingResponseDto>();
```

---

# Database Rules

Unique constraints:

Building:

```text
Code must be unique inside a Condominium
```

Unit:

```text
Number must be unique inside a Building
```

---

# Development Rules

Always:

* Follow existing project patterns
* Use async/await
* Use DTOs
* Use AutoMapper
* Use Dependency Injection
* Keep business logic inside Services

Never:

* Access DbContext in Controllers
* Return Entities directly
* Duplicate permission validations
* Duplicate business rules

---

# Current Priority

Current implementation focus:

1. UserCondominium
2. PermissionService
3. Access Validation
4. Admin Authorization
5. Resident Authorization

All future access control implementations should respect this architecture.
