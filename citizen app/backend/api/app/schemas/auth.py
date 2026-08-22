import uuid

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    city: str = Field(min_length=2, max_length=120)
    accepted_terms: bool

    model_config = {
        "json_schema_extra": {
            "example": {
                "full_name": "Arun Kumar",
                "email": "arun@example.com",
                "phone": "+919876543210",
                "password": "SafePath@123",
                "city": "Chennai",
                "accepted_terms": True,
            }
        }
    }


class LoginRequest(BaseModel):
    """`identifier` accepts either an email or a phone number, matching the
    mobile "Email or mobile" login field."""

    identifier: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None
    city: str | None = None
    profile_photo_url: str | None = None
    role: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    tokens: TokenPair
