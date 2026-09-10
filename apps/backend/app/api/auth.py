from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.user import new_user
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from pymongo.errors import DuplicateKeyError

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=TokenResponse)
async def register(user_data: RegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    hashed_pwd = get_password_hash(user_data.password)
    doc = new_user(
        email=user_data.email,
        password_hash=hashed_pwd,
        full_name=user_data.full_name
    )
    try:
        await db["users"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    token = create_access_token(data={"sub": doc["_id"]})
    user_resp = UserResponse(
        id=doc["_id"],
        email=doc["email"],
        full_name=doc["full_name"],
        created_at=doc["created_at"]
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token(data={"sub": user["_id"]})
    user_resp = UserResponse(
        id=user["_id"],
        email=user["email"],
        full_name=user.get("full_name"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        created_at=current_user["created_at"]
    )