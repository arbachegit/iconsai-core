"""
Admin Users API endpoints.
POST /functions/v1/admin/users - Create user
GET /functions/v1/admin/users - List users
PUT /functions/v1/admin/users/{id} - Update user
DELETE /functions/v1/admin/users/{id} - Delete user

Uses platform_users table for unified user management.
Requires admin/superadmin role authentication via Supabase JWT.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field, EmailStr
import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Models
# =============================================================================

class CreateUserRequest(BaseModel):
    """Request body for creating a new user."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")
    first_name: str = Field(..., min_length=2, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    role: str = Field(default="user", description="User role: user, admin, or superadmin")
    institution_id: Optional[str] = Field(None, description="Optional institution ID")


class UpdateUserRequest(BaseModel):
    """Request body for updating a user."""
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    role: Optional[str] = Field(None, description="User role")
    status: Optional[str] = Field(None, description="User status: active, suspended, inactive")
    institution_id: Optional[str] = Field(None, description="Institution ID")


class UserResponse(BaseModel):
    """User data response."""
    id: str
    auth_user_id: Optional[str] = None
    email: str
    first_name: str
    last_name: Optional[str] = None
    role: str = "user"
    status: str = "active"
    institution_id: Optional[str] = None
    created_at: Optional[str] = None
    last_login_at: Optional[str] = None


class UsersListResponse(BaseModel):
    """Response for listing users."""
    users: List[UserResponse]
    total: int


# =============================================================================
# Auth Dependencies
# =============================================================================

async def verify_admin_token(authorization: str = Header(...)) -> Dict[str, Any]:
    """
    Verify that the request comes from an authenticated admin/superadmin.
    """
    settings = get_settings()

    if not settings.has_supabase():
        raise HTTPException(
            status_code=500,
            detail={"error": "Supabase not configured"}
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid authorization header"}
        )

    token = authorization.replace("Bearer ", "")

    async with httpx.AsyncClient() as client:
        # Get user from token
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_service_role_key,
            }
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail={"error": "Invalid or expired token"}
            )

        user_data = response.json()
        user_id = user_data.get("id")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail={"error": "Invalid user data"}
            )

        # Check user role in platform_users table
        role_response = await client.get(
            f"{settings.supabase_url}/rest/v1/platform_users",
            params={
                "auth_user_id": f"eq.{user_id}",
                "status": "eq.active",
                "select": "role"
            },
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "apikey": settings.supabase_service_role_key,
            }
        )

        if role_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail={"error": "Failed to verify user role"}
            )

        users = role_response.json()

        if not users or users[0].get("role") not in ("admin", "superadmin"):
            raise HTTPException(
                status_code=403,
                detail={"error": "Acesso não autorizado. Requer permissão de administrador."}
            )

        return {
            "user_id": user_id,
            "email": user_data.get("email"),
            "role": users[0].get("role")
        }


# =============================================================================
# Endpoints
# =============================================================================

@router.post(
    "/functions/v1/admin/users",
    response_model=UserResponse,
    summary="Create a new user",
    description="Create a new user with specified role. Requires admin/superadmin access."
)
async def create_user(
    request: CreateUserRequest,
    admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """
    Create a new user in Supabase Auth and platform_users table.
    """
    settings = get_settings()
    logger.info(f"[admin/users] Create user request from {admin['email']}: {request.email}")

    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Create user in Supabase Auth
            auth_response = await client.post(
                f"{settings.supabase_url}/auth/v1/admin/users",
                json={
                    "email": request.email,
                    "password": request.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "first_name": request.first_name,
                        "last_name": request.last_name
                    }
                },
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json"
                }
            )

            if auth_response.status_code not in (200, 201):
                error_data = auth_response.json()
                error_msg = error_data.get("msg") or error_data.get("message") or "Falha ao criar usuário"
                logger.error(f"[admin/users] Auth create failed: {error_data}")
                raise HTTPException(status_code=400, detail={"error": error_msg})

            auth_user = auth_response.json()
            auth_user_id = auth_user.get("id")
            platform_user_id = str(uuid.uuid4())

            logger.info(f"[admin/users] User created in Auth: {auth_user_id}")

            # Step 2: Create entry in platform_users
            now = datetime.utcnow().isoformat()
            platform_response = await client.post(
                f"{settings.supabase_url}/rest/v1/platform_users",
                json={
                    "id": platform_user_id,
                    "auth_user_id": auth_user_id,
                    "email": request.email,
                    "first_name": request.first_name,
                    "last_name": request.last_name,
                    "role": request.role,
                    "status": "active",
                    "institution_id": request.institution_id,
                    "email_verified": True,
                    "password_set": True,
                    "login_count": 0,
                    "created_at": now,
                    "updated_at": now
                },
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                }
            )

            if platform_response.status_code not in (200, 201):
                logger.error(f"[admin/users] platform_users create failed: {platform_response.text}")
                # Try to clean up auth user
                await client.delete(
                    f"{settings.supabase_url}/auth/v1/admin/users/{auth_user_id}",
                    headers={
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                        "apikey": settings.supabase_service_role_key,
                    }
                )
                raise HTTPException(status_code=400, detail={"error": "Falha ao criar perfil do usuário"})

            logger.info(f"[admin/users] User setup complete: {request.email} with role {request.role}")

            return UserResponse(
                id=platform_user_id,
                auth_user_id=auth_user_id,
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                role=request.role,
                status="active",
                institution_id=request.institution_id,
                created_at=now
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[admin/users] Create error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail={"error": f"Erro ao criar usuário: {str(e)}"})


@router.get(
    "/functions/v1/admin/users",
    response_model=UsersListResponse,
    summary="List all users",
    description="Get list of all users from platform_users. Requires admin access."
)
async def list_users(
    admin: Dict[str, Any] = Depends(verify_admin_token),
    limit: int = 100,
    offset: int = 0
):
    """
    List all users from platform_users table.
    """
    settings = get_settings()
    logger.info(f"[admin/users] List users request from {admin['email']}")

    async with httpx.AsyncClient() as client:
        try:
            # Get users from platform_users
            response = await client.get(
                f"{settings.supabase_url}/rest/v1/platform_users",
                params={
                    "select": "*",
                    "order": "created_at.desc",
                    "limit": limit,
                    "offset": offset
                },
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Prefer": "count=exact"
                }
            )

            if response.status_code != 200:
                raise HTTPException(status_code=500, detail={"error": "Failed to fetch users"})

            # Get total count from header
            content_range = response.headers.get("content-range", "")
            total = 0
            if "/" in content_range:
                total = int(content_range.split("/")[1])

            platform_users = response.json()

            users = [
                UserResponse(
                    id=u.get("id"),
                    auth_user_id=u.get("auth_user_id"),
                    email=u.get("email", ""),
                    first_name=u.get("first_name", ""),
                    last_name=u.get("last_name"),
                    role=u.get("role", "user"),
                    status=u.get("status", "active"),
                    institution_id=u.get("institution_id"),
                    created_at=u.get("created_at"),
                    last_login_at=u.get("last_login_at")
                )
                for u in platform_users
            ]

            return UsersListResponse(users=users, total=total or len(users))

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[admin/users] List error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail={"error": f"Erro ao listar usuários: {str(e)}"})


@router.put(
    "/functions/v1/admin/users/{user_id}",
    response_model=UserResponse,
    summary="Update user",
    description="Update user in platform_users. Requires admin access."
)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """
    Update user in platform_users table.
    """
    settings = get_settings()
    logger.info(f"[admin/users] Update user {user_id} from {admin['email']}")

    async with httpx.AsyncClient() as client:
        try:
            # Build update data
            update_data = {"updated_at": datetime.utcnow().isoformat()}

            if request.first_name:
                update_data["first_name"] = request.first_name
            if request.last_name is not None:
                update_data["last_name"] = request.last_name
            if request.role:
                update_data["role"] = request.role
            if request.status:
                update_data["status"] = request.status
            if request.institution_id is not None:
                update_data["institution_id"] = request.institution_id

            # Update platform_users
            response = await client.patch(
                f"{settings.supabase_url}/rest/v1/platform_users",
                params={"id": f"eq.{user_id}"},
                json=update_data,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                }
            )

            if response.status_code not in (200, 204):
                raise HTTPException(status_code=400, detail={"error": "Falha ao atualizar usuário"})

            # Get updated user
            get_response = await client.get(
                f"{settings.supabase_url}/rest/v1/platform_users",
                params={"id": f"eq.{user_id}", "select": "*"},
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                }
            )

            users = get_response.json() if get_response.status_code == 200 else []
            user = users[0] if users else {}

            return UserResponse(
                id=user.get("id", user_id),
                auth_user_id=user.get("auth_user_id"),
                email=user.get("email", ""),
                first_name=user.get("first_name", ""),
                last_name=user.get("last_name"),
                role=user.get("role", "user"),
                status=user.get("status", "active"),
                institution_id=user.get("institution_id"),
                created_at=user.get("created_at"),
                last_login_at=user.get("last_login_at")
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[admin/users] Update error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail={"error": f"Erro ao atualizar usuário: {str(e)}"})


@router.delete(
    "/functions/v1/admin/users/{user_id}",
    summary="Delete user",
    description="Delete a user. Requires admin access."
)
async def delete_user(
    user_id: str,
    admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """
    Delete user from platform_users and Supabase Auth.
    """
    settings = get_settings()
    logger.info(f"[admin/users] Delete user {user_id} from {admin['email']}")

    async with httpx.AsyncClient() as client:
        try:
            # Get user's auth_user_id first
            get_response = await client.get(
                f"{settings.supabase_url}/rest/v1/platform_users",
                params={"id": f"eq.{user_id}", "select": "auth_user_id"},
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                }
            )

            users = get_response.json() if get_response.status_code == 200 else []
            auth_user_id = users[0].get("auth_user_id") if users else None

            # Delete from platform_users
            await client.delete(
                f"{settings.supabase_url}/rest/v1/platform_users",
                params={"id": f"eq.{user_id}"},
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                }
            )

            # Delete from auth if auth_user_id exists
            if auth_user_id:
                await client.delete(
                    f"{settings.supabase_url}/auth/v1/admin/users/{auth_user_id}",
                    headers={
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                        "apikey": settings.supabase_service_role_key,
                    }
                )

            return {"success": True, "message": "Usuário deletado com sucesso"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[admin/users] Delete error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail={"error": f"Erro ao deletar usuário: {str(e)}"})
