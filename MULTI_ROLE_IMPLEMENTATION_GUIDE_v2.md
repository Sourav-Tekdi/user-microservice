# 🚀 Multi-Role Implementation Guide v2.0
**Updated:** October 30, 2025  
**Approach:** Code Pattern-Based Changes (Resilient to Line Number Changes)

---

## 📌 Important Notes Before Starting

⚠️ **This guide uses CODE PATTERNS instead of line numbers** - Your recent code changes won't affect the implementation.

🔍 **Search for patterns** - Each step shows the exact code to find and replace.

✅ **Test incrementally** - Verify each API before moving to the next.

📸 **Backup first** - Create a git branch before starting:
```bash
git checkout -b feature/multi-role-support
git add .
git commit -m "Backup before multi-role implementation"
```

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [API 1: POST /list](#api-1-post-list)
3. [API 2: GET /read/:userId](#api-2-get-readuserid)
4. [API 3: POST /hierarchical-search](#api-3-post-hierarchical-search)
5. [API 4: PATCH /update/:userid](#api-4-patch-updateuserid)
6. [Testing & Verification](#testing--verification)
7. [Rollback Instructions](#rollback-instructions)

---

## Prerequisites

### Understanding the Change

**Current State (Single Role):**
```json
{
  "userId": "123",
  "username": "john",
  "role": "Admin"  // ❌ Single string
}
```

**Target State (Multi-Role):**
```json
{
  "userId": "123",
  "username": "john",
  "roles": [  // ✅ Array of objects
    { "id": "role-uuid-1", "name": "Admin" },
    { "id": "role-uuid-2", "name": "Instructor" }
  ]
}
```

### Step 0.1: Create Response DTO

**File:** `src/user/dto/user-response.dto.ts` (Create new file)

```typescript
import { Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Standard Role Response DTO
 * Used across all APIs for consistent role format
 */
export class RoleDto {
  @ApiProperty({
    type: String,
    description: "Role ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @Expose()
  id: string;

  @ApiProperty({
    type: String,
    description: "Role Name",
    example: "Admin"
  })
  @Expose()
  name: string;
}
```

**Verify:**
```bash
npm run build
# Should compile without errors
```

---

## API 1: POST /list

### Current vs Expected Behavior

**Current Response:**
```json
{
  "getUserDetails": [{
    "userId": "123",
    "username": "john",
    "role": "Admin"  // ❌ Returns only one role
  }]
}
```

**Expected Response:**
```json
{
  "getUserDetails": [{
    "userId": "123",
    "username": "john",
    "roles": [  // ✅ Returns all roles
      { "id": "role-uuid-1", "name": "Admin" },
      { "id": "role-uuid-2", "name": "Instructor" }
    ]
  }]
}
```

---

### Step 1.1: Update Search DTO - Add roles filter

**File:** `src/user/dto/user-search.dto.ts`  
**Location:** In the `setFilters` class

**FIND THIS CODE:**
```typescript
  @ApiPropertyOptional({
    type: String,
    description: "Role",
  })
  role: string;
```

**REPLACE WITH:**
```typescript
  @ApiPropertyOptional({
    type: [String],
    description: "Roles - Filter by multiple role names (OR logic). Example: ['Admin', 'Instructor']",
    example: ["Admin", "Instructor", "Learner"]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  // Deprecated: Keep for backward compatibility
  @ApiPropertyOptional({
    type: String,
    description: "Role (deprecated - use 'roles' instead)",
  })
  @IsOptional()
  @IsString()
  role?: string;
```

**Verify:**
```bash
npm run build
```

---

### Step 1.2: Update Search DTO - Add roleIds to tenantCohortRoleMapping

**File:** `src/user/dto/user-search.dto.ts`  
**Location:** In the `tenantCohortRoleMappingDto` class

**FIND THIS CODE:**
```typescript
  @ApiPropertyOptional({
    type: String,
    description: "Role Id",
  })
  @Expose()
  @IsOptional()
  @IsUUID()
  roleId: string;
```

**REPLACE WITH:**
```typescript
  @ApiPropertyOptional({
    type: [String],
    description: "Role Ids - Filter by multiple role IDs",
    example: ["role-uuid-1", "role-uuid-2"]
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];

  // Deprecated: Keep for backward compatibility
  @ApiPropertyOptional({
    type: String,
    description: "Role Id (deprecated - use 'roleIds' instead)",
  })
  @Expose()
  @IsOptional()
  @IsUUID()
  roleId?: string;
```

**Verify:**
```bash
npm run build
```

---

### Step 1.3: Add Helper Method - findAllUserRoles

**File:** `src/adapters/postgres/user-adapter.ts`  
**Location:** Add this method AFTER the existing `findUserRoles()` method

**SEARCH FOR:**
```typescript
async findUserRoles(userId: string, tenantId: string)
```

**ADD THIS METHOD IMMEDIATELY AFTER IT:**
```typescript
  /**
   * Find all roles for a user in a specific tenant
   * Returns array of roles with id and name
   * @param userId - The user's UUID
   * @param tenantId - The tenant's UUID
   * @returns Array of role objects with id and name
   */
  async findAllUserRoles(userId: string, tenantId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const getRoles = await this.userRoleMappingRepository.find({
        where: {
          userId: userId,
          tenantId: tenantId,
        },
      });

      if (!getRoles || getRoles.length === 0) {
        return [];
      }

      const rolePromises = getRoles.map(mapping =>
        this.roleRepository.findOne({
          where: { roleId: mapping.roleId },
          select: ["roleId", "title"],
        })
      );

      const roles = await Promise.all(rolePromises);

      return roles
        .filter(role => role !== null)
        .map(role => ({
          id: role.roleId,
          name: role.title
        }));
    } catch (error) {
      LoggerUtil.error(
        `Error fetching roles for user ${userId} in tenant ${tenantId}`,
        error.message,
        APIID.USER_LIST
      );
      return [];
    }
  }
```

**Verify:**
```bash
npm run build
```

---

### Step 1.4: Update findAllUserDetails Method (MAJOR CHANGE)

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS METHOD SIGNATURE:**
```typescript
async findAllUserDetails(userSearchDto, tenantId?: string) {
```

**REPLACE THE ENTIRE METHOD with this new implementation:**

> ⚠️ **Important:** This is a complete method replacement. Copy the entire code below.

```typescript
  async findAllUserDetails(userSearchDto, tenantId?: string) {
    let { limit, offset, filters, exclude, sort } = userSearchDto;
    let excludeCohortIdes;
    let excludeUserIdes;

    // ==== BACKWARD COMPATIBILITY LAYER ====
    // Convert old filter format to new format
    if (filters) {
      // Handle old 'role' field (string) -> new 'roles' field (array)
      if (filters.role && !filters.roles) {
        filters.roles = Array.isArray(filters.role) ? filters.role : [filters.role];
        LoggerUtil.warn('filters.role is deprecated, use filters.roles instead', APIID.USER_LIST);
      }
    }

    // Handle tenantCohortRoleMapping backward compatibility
    if (userSearchDto.tenantCohortRoleMapping) {
      const mapping = userSearchDto.tenantCohortRoleMapping;
      if (mapping.roleId && !mapping.roleIds) {
        mapping.roleIds = [mapping.roleId];
        LoggerUtil.warn('tenantCohortRoleMapping.roleId is deprecated, use roleIds instead', APIID.USER_LIST);
      }
    }
    // ==== END BACKWARD COMPATIBILITY ====

    offset = offset ? `OFFSET ${offset}` : "";
    limit = limit ? `LIMIT ${limit}` : "";
    const result = {
      totalCount: 0,
      getUserDetails: [],
    };

    let whereCondition = `WHERE`;
    let index = 0;
    const searchCustomFields: any = {};

    const userAllKeys = this.usersRepository.metadata.columns.map(
      (column) => column.propertyName
    );
    const userKeys = userAllKeys.filter(
      (key) => key !== "district" && key !== "state"
    );

    // Track if we need role filtering
    let roleFilterArray: string[] = [];

    if (filters && Object.keys(filters).length > 0) {
      let coreFields = await this.getCoreColumnNames();
      const allCoreField = [...coreFields, 'fromDate', 'toDate', 'roles', 'tenantId', 'name'];

      for (const [key, value] of Object.entries(filters)) {
        if (allCoreField.includes(key)) {
          if (index > 0 && index < Object.keys(filters).length) {
            whereCondition += ` AND `;
          }
          switch (key) {
            case "firstName":
            case "name":
              whereCondition += ` U."${key}" ILIKE '%${value}%'`;
              index++;
              break;

            case "status":
            case "email":
            case "username":
            case "userId":
              if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
                const status = value.map((item) => `'${item.trim().toLowerCase()}'`).join(",");
                whereCondition += ` U."${key}" IN(${status})`;
              } else {
                if (key === "username") {
                  whereCondition += ` U."${key}" ILIKE '${value}'`;
                } else {
                  whereCondition += ` U."${key}" = '${value}'`;
                }
              }
              index++;
              break;

            case "roles":
              // Store role filter for later use
              if (Array.isArray(value) && value.length > 0) {
                roleFilterArray = value;
              }
              break;

            case "fromDate":
              whereCondition += ` DATE(U."createdAt") >= '${value}'`;
              index++;
              break;

            case "toDate":
              whereCondition += ` DATE(U."createdAt") <= '${value}'`;
              index++;
              break;

            case "tenantId":
              whereCondition += `UTM."tenantId" = '${value}'`;
              index++;
              break;

            default:
              whereCondition += ` U."${key}" = '${value}'`;
              index++;
              break;
          }
        } else {
          searchCustomFields[key] = value;
        }
      }
    }

    if (exclude && Object.keys(exclude).length > 0) {
      Object.entries(exclude).forEach(([key, value]) => {
        if (key == "cohortIds") {
          excludeCohortIdes = value;
        }
        if (key == "userIds") {
          excludeUserIdes = value;
        }
      });
    }

    let orderingCondition = "";
    if (sort && Object.keys(sort).length > 0) {
      orderingCondition = `ORDER BY U."${sort[0]}" ${sort[1]}`;
    }

    let getUserIdUsingCustomFields;

    if (Object.keys(searchCustomFields).length > 0) {
      const context = "USERS";
      getUserIdUsingCustomFields =
        await this.fieldsService.filterUserUsingCustomFieldsOptimized(
          context,
          searchCustomFields
        );

      if (getUserIdUsingCustomFields == null) {
        return false;
      }
    }

    if (getUserIdUsingCustomFields && getUserIdUsingCustomFields.length > 0) {
      const userIdsDependsOnCustomFields = getUserIdUsingCustomFields
        .map((userId) => `'${userId}'`)
        .join(",");
      whereCondition += `${index > 0 ? " AND " : ""} U."userId" IN (${userIdsDependsOnCustomFields})`;
      index++;
    }

    const userIds =
      excludeUserIdes?.length > 0
        ? excludeUserIdes.map((userId) => `'${userId}'`).join(",")
        : null;

    const cohortIds =
      excludeCohortIdes?.length > 0
        ? excludeCohortIdes.map((cohortId) => `'${cohortId}'`).join(",")
        : null;

    if (userIds || cohortIds) {
      const userCondition = userIds ? ` U."userId" NOT IN (${userIds})` : "";
      const cohortCondition = cohortIds
        ? `CM."cohortId" NOT IN (${cohortIds})`
        : "";
      const combinedCondition = [userCondition, cohortCondition]
        .filter(String)
        .join(" AND ");
      whereCondition += (index > 0 ? " AND " : "") + combinedCondition;
    } else if (index === 0) {
      whereCondition = "";
    }

    // Apply tenant filtering
    if (tenantId && tenantId.trim() !== '') {
      if (index === 0 && whereCondition === "") {
        whereCondition = `WHERE UTM."tenantId" = '${tenantId}'`;
      } else {
        whereCondition += ` AND UTM."tenantId" = '${tenantId}'`;
      }
      LoggerUtil.log(`Applying tenant filter for tenantId: ${tenantId}`, APIID.USER_LIST);
    } else {
      LoggerUtil.warn(`No tenantId provided - returning users from all tenants`, APIID.USER_LIST);
    }

    // ==== NEW QUERY WITH ROLE AGGREGATION ====
    let roleWhereCondition = "";
    
    if (roleFilterArray.length > 0) {
      const roleNames = roleFilterArray.map(role => `'${role}'`).join(",");
      roleWhereCondition = `AND R."title" IN (${roleNames})`;
    }

    const query = `
      WITH user_base AS (
        SELECT DISTINCT
          U."userId",
          U."enrollmentId",
          U."username",
          U."email",
          U."firstName",
          U."name",
          U."middleName",
          U."lastName",
          U."gender",
          U."dob",
          U."mobile",
          U."createdBy",
          U."updatedBy",
          U."createdAt",
          U."updatedAt",
          U."status",
          UTM."tenantId"
        FROM public."Users" U
        LEFT JOIN public."CohortMembers" CM ON CM."userId" = U."userId"
        LEFT JOIN public."UserTenantMapping" UTM ON UTM."userId" = U."userId"
        ${roleFilterArray.length > 0 ? `
        INNER JOIN public."UserRolesMapping" UR_FILTER ON UR_FILTER."userId" = U."userId" AND UR_FILTER."tenantId" = UTM."tenantId"
        INNER JOIN public."Roles" R_FILTER ON R_FILTER."roleId" = UR_FILTER."roleId" ${roleWhereCondition}
        ` : ''}
        ${whereCondition}
      ),
      user_roles AS (
        SELECT 
          ub."userId",
          json_agg(
            json_build_object(
              'id', R."roleId",
              'name', R."title"
            ) ORDER BY R."title"
          ) FILTER (WHERE R."roleId" IS NOT NULL) as roles
        FROM user_base ub
        LEFT JOIN public."UserRolesMapping" UR ON UR."userId" = ub."userId" AND UR."tenantId" = ub."tenantId"
        LEFT JOIN public."Roles" R ON R."roleId" = UR."roleId"
        GROUP BY ub."userId"
      ),
      counted_users AS (
        SELECT ub.*, COUNT(*) OVER() AS total_count
        FROM user_base ub
      )
      SELECT 
        cu.*,
        COALESCE(ur.roles, '[]'::json) as roles
      FROM counted_users cu
      LEFT JOIN user_roles ur ON ur."userId" = cu."userId"
      ${orderingCondition}
      ${limit} ${offset}
    `;

    const userDetails = await this.usersRepository.query(query);

    if (userDetails.length > 0) {
      result.totalCount = parseInt(userDetails[0].total_count, 10);

      for (const userData of userDetails) {
        // Parse roles JSON if it's a string
        if (typeof userData.roles === 'string') {
          userData.roles = JSON.parse(userData.roles);
        }

        // Get custom fields
        const customFields = await this.fieldsService.getCustomFieldDetails(
          userData.userId, 'Users'
        );

        userData["customFields"] = Array.isArray(customFields)
          ? customFields.map((data) => ({
            fieldId: data?.fieldId,
            label: data?.label,
            selectedValues: data?.selectedValues,
            type: data?.type,
          }))
          : [];

        result.getUserDetails.push(userData);
      }
    } else {
      return false;
    }
    return result;
  }
```

**Verify:**
```bash
npm run build
# Should compile without errors
```

---

### Step 1.5: Test API 1

**Test Case 1: Basic list (all users)**
```bash
curl -X POST http://localhost:3000/user/list \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {}
  }'
```

**Expected:** All users with their complete roles array

**Test Case 2: Filter by single role**
```bash
curl -X POST http://localhost:3000/user/list \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {
      "roles": ["Admin"]
    }
  }'
```

**Expected:** Users with Admin role, showing ALL their roles

**Test Case 3: Filter by multiple roles (OR logic)**
```bash
curl -X POST http://localhost:3000/user/list \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {
      "roles": ["Admin", "Instructor", "Learner"]
    }
  }'
```

**Expected:** Users with ANY of these roles, showing all their roles

**Test Case 4: Backward compatibility**
```bash
curl -X POST http://localhost:3000/user/list \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {
      "role": "Admin"
    }
  }'
```

**Expected:** Works with deprecation warning in logs

**Verify Checklist:**
- ✅ Single row per user (no duplicates)
- ✅ Roles field is array of objects `[{ id, name }]`
- ✅ Role filtering works with OR logic
- ✅ Backward compatibility works

---

## API 2: GET /read/:userId

### Current vs Expected Behavior

**Current Response:**
```json
{
  "userData": {
    "userId": "123",
    "role": "Admin",  // ❌ Single string
    "tenantData": [{
      "roles": [
        { "roleId": "uuid1", "roleName": "Admin" }  // ❌ Wrong format
      ]
    }]
  }
}
```

**Expected Response:**
```json
{
  "userData": {
    "userId": "123",
    "roles": [  // ✅ Array of objects
      { "id": "uuid1", "name": "Admin" },
      { "id": "uuid2", "name": "Instructor" }
    ],
    "tenantData": [{
      "roles": [  // ✅ Consistent format
        { "id": "uuid1", "name": "Admin" },
        { "id": "uuid2", "name": "Instructor" }
      ]
    }]
  }
}
```

---

### Step 2.1: Update getUsersDetailsById Method

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS CODE BLOCK:**
```typescript
    const [userDetails, userRole] = await Promise.all([
      this.findUserDetails(userData?.userId),
      userData && userData?.tenantId
        ? this.findUserRoles(userData?.userId, userData?.tenantId)
        : Promise.resolve(null),
    ]);

    let roleInUpper;
    if (userRole) {
      roleInUpper = userRole ? userRole.title.toUpperCase() : null;
      userDetails["role"] = userRole.title;
    }
```

**REPLACE WITH:**
```typescript
    const [userDetails, userRoles] = await Promise.all([
      this.findUserDetails(userData?.userId),
      userData && userData?.tenantId
        ? this.findAllUserRoles(userData?.userId, userData?.tenantId)  // Use new method
        : Promise.resolve([]),
    ]);

    // Add roles array in standard format
    userDetails["roles"] = userRoles;  // Already in correct format: [{ id, name }]

    // For custom fields, we need at least one role for context
    let roleInUpper;
    if (userRoles && userRoles.length > 0) {
      roleInUpper = userRoles[0].name.toUpperCase();
    }
```

**Verify:**
```bash
npm run build
```

---

### Step 2.2: Update userTenantRoleData Method

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS CODE BLOCK:**
```typescript
        roleData.forEach(role => {
          const roleExists = existingTenant.roles.some(existingRole =>
            existingRole.roleId === role.roleid
          );
          if (!roleExists) {
            existingTenant.roles.push({
              roleId: role.roleid,
              roleName: role.title,
            });
          }
        });
```

**REPLACE WITH:**
```typescript
        roleData.forEach(role => {
          const roleExists = existingTenant.roles.some(existingRole =>
            existingRole.id === role.roleid  // Changed from roleId
          );
          if (!roleExists) {
            existingTenant.roles.push({
              id: role.roleid,      // Changed from roleId
              name: role.title,     // Changed from roleName
            });
          }
        });
```

**SEARCH FOR THIS CODE BLOCK:**
```typescript
        } else {
          const roles = roleData.map(role => ({
            roleId: role.roleid,
            roleName: role.title,
          }));
```

**REPLACE WITH:**
```typescript
        } else {
          const roles = roleData.map(role => ({
            id: role.roleid,      // Changed from roleId
            name: role.title,     // Changed from roleName
          }));
```

**Verify:**
```bash
npm run build
```

---

### Step 2.3: Test API 2

**Test Case 1: Get user with single role**
```bash
curl -X GET "http://localhost:3000/user/read/{userId}?fieldvalue=true" \
  -H "tenantid: your-tenant-uuid" \
  -H "Authorization: Bearer {token}"
```

**Expected Response Format:**
```json
{
  "result": {
    "userData": {
      "userId": "123",
      "username": "john",
      "roles": [{ "id": "uuid", "name": "Admin" }],
      "tenantData": [{
        "tenantId": "tenant-uuid",
        "roles": [{ "id": "uuid", "name": "Admin" }]
      }]
    }
  }
}
```

**Test Case 2: User with multiple roles**
```bash
curl -X GET "http://localhost:3000/user/read/{userId}" \
  -H "tenantid: your-tenant-uuid" \
  -H "Authorization: Bearer {token}"
```

**Expected:** Shows all roles in both top-level and tenantData

**Verify Checklist:**
- ✅ Top-level `roles` field is array of objects
- ✅ `tenantData[].roles` format matches top-level
- ✅ Shows roles for specified tenant only
- ✅ Consistent format across response

---

## API 3: POST /hierarchical-search

### Current vs Expected Behavior

**Current Response:**
```json
{
  "users": [{
    "userId": "123",
    "roles": ["Admin", "Instructor"]  // ❌ Array of strings
  }]
}
```

**Expected Response:**
```json
{
  "users": [{
    "userId": "123",
    "roles": [  // ✅ Array of objects
      { "id": "uuid1", "name": "Admin" },
      { "id": "uuid2", "name": "Instructor" }
    ]
  }]
}
```

---

### Step 3.1: Update buildOptimizedUserQuery Method

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS CODE PATTERN:**
```typescript
      )
      SELECT pu.*, r."name" as "roleName"
      FROM paginated_users pu
      LEFT JOIN "UserRolesMapping" urm ON pu."userId" = urm."userId" AND pu."tenantId" = urm."tenantId"
      LEFT JOIN "Roles" r ON urm."roleId" = r."roleId"
      ORDER BY pu."${sortField}" ${sortDirection}
    `;
```

**REPLACE WITH:**
```typescript
      ),
      user_roles AS (
        SELECT 
          pu."userId",
          json_agg(
            json_build_object(
              'id', r."roleId",
              'name', r."title"
            ) ORDER BY r."title"
          ) FILTER (WHERE r."roleId" IS NOT NULL) as roles
        FROM paginated_users pu
        LEFT JOIN "UserRolesMapping" urm ON pu."userId" = urm."userId" AND pu."tenantId" = urm."tenantId"
        LEFT JOIN "Roles" r ON urm."roleId" = r."roleId"
        GROUP BY pu."userId"
      )
      SELECT 
        pu.*,
        COALESCE(ur.roles, '[]'::json) as roles
      FROM paginated_users pu
      LEFT JOIN user_roles ur ON pu."userId" = ur."userId"
      ORDER BY pu."${sortField}" ${sortDirection}
    `;
```

**Verify:**
```bash
npm run build
```

---

### Step 3.2: Update processOptimizedUserResults Method

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS METHOD:**
```typescript
  private async processOptimizedUserResults(
    queryResults: any[],
    customFieldsData: any,
    batchCenterData: any
  ): Promise<any[]> {
```

**REPLACE THE ENTIRE METHOD WITH:**
```typescript
  private async processOptimizedUserResults(
    queryResults: any[],
    customFieldsData: any,
    batchCenterData: any
  ): Promise<any[]> {
    const userMap = new Map();

    for (const row of queryResults) {
      const userId = row.userId;

      // Parse roles JSON if it's a string
      let rolesArray = row.roles;
      if (typeof rolesArray === 'string') {
        rolesArray = JSON.parse(rolesArray);
      }
      if (!Array.isArray(rolesArray)) {
        rolesArray = [];
      }

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: row.userId,
          username: row.username,
          firstName: row.firstName,
          name: row.name,
          middleName: row.middleName,
          lastName: row.lastName,
          email: row.email,
          mobile: row.mobile,
          gender: row.gender,
          dob: row.dob,
          status: row.status,
          createdAt: row.createdAt,
          tenantId: row.tenantId,
          roles: rolesArray,  // Already in correct format from SQL
          customfield: customFieldsData[userId] || [],
          cohortData: batchCenterData[userId] || []
        });
      }
    }

    return Array.from(userMap.values());
  }
```

**Verify:**
```bash
npm run build
```

---

### Step 3.3: Test API 3

**Test Case 1: Basic hierarchical search**
```bash
curl -X POST http://localhost:3000/user/hierarchical-search \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {
      "state": ["state-uuid"]
    },
    "sort": ["name", "asc"]
  }'
```

**Expected:** Roles are objects with `id` and `name`

**Test Case 2: With role filter**
```bash
curl -X POST http://localhost:3000/user/hierarchical-search \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{
    "limit": 10,
    "offset": 0,
    "filters": {},
    "role": ["Admin", "Instructor"],
    "sort": ["name", "asc"]
  }'
```

**Expected:** Users with these roles, showing all their roles

**Verify Checklist:**
- ✅ Roles are array of objects (not strings)
- ✅ Each role has `id` and `name`
- ✅ Single row per user
- ✅ All user's roles shown

---

## API 4: PATCH /update/:userid

### Current vs Expected Behavior

**Current Request/Response:**
```json
// Request - role field accepted but ignored
{
  "userData": {
    "firstName": "Johnny",
    "role": "Admin"  // ❌ Should not be here
  }
}

// Response - no role info
{
  "basicDetails": {
    "firstName": "Johnny"
  }
}
```

**Expected Request/Response:**
```json
// Request - no role field
{
  "userData": {
    "firstName": "Johnny"
  }
}

// Response - includes roles
{
  "basicDetails": {
    "firstName": "Johnny",
    "roles": [  // ✅ Added
      { "id": "uuid", "name": "Admin" }
    ]
  }
}
```

---

### Step 4.1: Update UserUpdateDTO - Remove role field

**File:** `src/user/dto/user-update.dto.ts`

**SEARCH FOR THIS CODE in UserDataDTO class:**
```typescript
  @ApiProperty({ type: () => String })
  @IsString()
  @IsOptional()
  role: string;
```

**DELETE these 4 lines completely**

**Verify:**
```bash
npm run build
```

---

### Step 4.2: Update updateUser Method - Add roles to response

**File:** `src/adapters/postgres/user-adapter.ts`

**SEARCH FOR THIS CODE PATTERN:**
```typescript
      LoggerUtil.log(
        API_RESPONSES.USER_UPDATED_SUCCESSFULLY,
        apiId,
        userDto?.userId
      );

      // Send response to the client
      const apiResponse = await APIResponse.success(
        response,
        apiId,
        { ...updatedData, editIssues },
        HttpStatus.OK,
        API_RESPONSES.USER_UPDATED_SUCCESSFULLY
      );
```

**REPLACE WITH:**
```typescript
      LoggerUtil.log(
        API_RESPONSES.USER_UPDATED_SUCCESSFULLY,
        apiId,
        userDto?.userId
      );

      // Fetch user's current roles to include in response
      let userRoles = [];
      if (userDto.userData?.tenantId) {
        userRoles = await this.findAllUserRoles(userDto.userId, userDto.userData.tenantId);
      }

      // Add roles to basicDetails in response
      if (userRoles.length > 0) {
        updatedData["basicDetails"]["roles"] = userRoles;
      }

      // Send response to the client
      const apiResponse = await APIResponse.success(
        response,
        apiId,
        { ...updatedData, editIssues },
        HttpStatus.OK,
        API_RESPONSES.USER_UPDATED_SUCCESSFULLY
      );
```

**Verify:**
```bash
npm run build
```

---

### Step 4.3: Test API 4

**Test Case 1: Update user**
```bash
curl -X PATCH http://localhost:3000/user/update/{userId} \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "userData": {
      "firstName": "Johnny",
      "lastName": "Doe"
    }
  }'
```

**Expected Response:**
```json
{
  "result": {
    "basicDetails": {
      "firstName": "Johnny",
      "lastName": "Doe",
      "roles": [
        { "id": "role-uuid-1", "name": "Admin" },
        { "id": "role-uuid-2", "name": "Instructor" }
      ]
    }
  }
}
```

**Test Case 2: Update without tenantId**
```bash
curl -X PATCH http://localhost:3000/user/update/{userId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "userData": {
      "firstName": "Johnny"
    }
  }'
```

**Expected:** Update succeeds, no roles in response

**Verify Checklist:**
- ✅ Role field removed from input DTO
- ✅ Roles array added to response
- ✅ Shows all user's roles for the tenant
- ✅ Update works without tenantId

---

## Testing & Verification

### Complete Test Suite

Run all tests after implementation:

```bash
# Test API 1
curl -X POST http://localhost:3000/user/list \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{"limit": 10, "offset": 0, "filters": {"roles": ["Admin"]}}'

# Test API 2
curl -X GET "http://localhost:3000/user/read/{userId}?fieldvalue=true" \
  -H "tenantid: your-tenant-uuid"

# Test API 3
curl -X POST http://localhost:3000/user/hierarchical-search \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{"limit": 10, "offset": 0, "filters": {}, "sort": ["name", "asc"]}'

# Test API 4
curl -X PATCH http://localhost:3000/user/update/{userId} \
  -H "Content-Type: application/json" \
  -H "tenantid: your-tenant-uuid" \
  -d '{"userData": {"firstName": "Updated"}}'
```

### Final Verification Checklist

- [ ] **API 1 (POST /list)**
  - [ ] Returns single row per user
  - [ ] Roles are array of objects with `id` and `name`
  - [ ] Role filter works with multiple roles (OR logic)
  - [ ] Backward compatibility works (old `role` field)
  
- [ ] **API 2 (GET /read/:userId)**
  - [ ] Top-level `roles` field is array of objects
  - [ ] `tenantData[].roles` matches format
  - [ ] Shows roles for specified tenant only
  - [ ] Works with and without `fieldvalue` parameter
  
- [ ] **API 3 (POST /hierarchical-search)**
  - [ ] Roles are array of objects (not strings)
  - [ ] Single row per user
  - [ ] All roles shown
  
- [ ] **API 4 (PATCH /update/:userid)**
  - [ ] Role field removed from input
  - [ ] Roles included in response
  - [ ] Update works correctly
  
- [ ] **General**
  - [ ] No compilation errors
  - [ ] No breaking changes in database
  - [ ] Consistent format across all APIs
  - [ ] Performance is acceptable
  - [ ] Backward compatibility maintained

---

## Rollback Instructions

If any issues occur after deploying:

### Option 1: Revert Last Commit
```bash
git revert HEAD
npm run build
npm run start:dev
```

### Option 2: Rollback to Specific Commit
```bash
# Find the commit before changes
git log --oneline

# Rollback
git reset --hard {commit-hash-before-changes}
npm run build
npm run start:dev
```

### Option 3: Restore from Branch
```bash
# If you created a backup branch
git checkout main  # or your main branch
git branch -D feature/multi-role-support
npm run build
npm run start:dev
```

---

## Common Issues & Solutions

### Issue 1: Roles showing as string instead of parsed JSON

**Solution:** Check if `typeof userData.roles === 'string'` and parse it:
```typescript
if (typeof userData.roles === 'string') {
  userData.roles = JSON.parse(userData.roles);
}
```

### Issue 2: Duplicate users in list

**Solution:** Ensure you're using `json_agg` with `GROUP BY` in SQL query

### Issue 3: Performance degradation

**Solution:** Add indexes on frequently joined columns:
```sql
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant 
  ON "UserRolesMapping"("userId", "tenantId");
```

### Issue 4: Old clients breaking

**Solution:** Keep backward compatibility layer - it handles old `role` field automatically

---

## Notes

- ✅ Test each API thoroughly before moving to the next
- ✅ Keep backward compatibility for smooth transition
- ✅ Log deprecation warnings for old format usage
- ✅ Monitor performance after each change
- ✅ Update API documentation after all changes

---

**END OF MULTI-ROLE IMPLEMENTATION GUIDE v2.0**

