from pathlib import Path

ROOT = Path(r"D:\TikunTech\uniliverimagestudy")

# --- onboarding helper module ---
onboarding_py = ROOT / "app/services/onboarding.py"
onboarding_py.write_text(
    '''from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user_model import User
from app.schemas.user_schema import OnboardingStatusResponse


def build_onboarding_status(user: Optional[User]) -> OnboardingStatusResponse:
    if not user:
        return OnboardingStatusResponse()

    dashboard_done = bool(user.dashboard_onboarding_completed or user.dashboard_onboarding_skipped)
    create_study_done = bool(
        user.create_study_onboarding_completed or user.create_study_onboarding_skipped
    )

    return OnboardingStatusResponse(
        onboarding_completed=dashboard_done,
        onboarding_skipped=bool(user.dashboard_onboarding_skipped),
        create_study_onboarding_completed=create_study_done,
        create_study_onboarding_skipped=bool(user.create_study_onboarding_skipped),
        show_dashboard_onboarding=not dashboard_done,
        show_create_study_onboarding=not create_study_done,
    )


def get_onboarding_status_for_user_id(db: Session, user_id: str) -> OnboardingStatusResponse:
    try:
        uid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        return OnboardingStatusResponse()

    user = (
        db.query(User)
        .filter(User.id == uid, User.is_active.is_(True))
        .first()
    )
    return build_onboarding_status(user)


def mark_dashboard_onboarding_complete(db: Session, user: User) -> User:
    user.dashboard_onboarding_completed = True
    user.dashboard_onboarding_skipped = False
    db.commit()
    db.refresh(user)
    return user


def mark_dashboard_onboarding_skipped(db: Session, user: User) -> User:
    user.dashboard_onboarding_skipped = True
    db.commit()
    db.refresh(user)
    return user


def mark_create_study_onboarding_complete(db: Session, user: User) -> User:
    user.create_study_onboarding_completed = True
    user.create_study_onboarding_skipped = False
    db.commit()
    db.refresh(user)
    return user


def mark_create_study_onboarding_skipped(db: Session, user: User) -> User:
    user.create_study_onboarding_skipped = True
    db.commit()
    db.refresh(user)
    return user
''',
    encoding="utf-8",
)

# --- patch user.py API ---
user_api = ROOT / "app/api/v1/user.py"
api_text = user_api.read_text(encoding="utf-8")

if "OnboardingStatusResponse" not in api_text:
    api_text = api_text.replace(
        "    ValidateTokenRequest, ValidateTokenResponse,\n",
        "    ValidateTokenRequest, ValidateTokenResponse, OnboardingStatusResponse,\n",
    )
    api_text = api_text.replace(
        "from app.core.security import verify_token, refresh_access_token\n",
        "from app.core.security import verify_token, refresh_access_token\n"
        "from app.services.onboarding import (\n"
        "    build_onboarding_status,\n"
        "    get_onboarding_status_for_user_id,\n"
        "    mark_dashboard_onboarding_complete,\n"
        "    mark_dashboard_onboarding_skipped,\n"
        "    mark_create_study_onboarding_complete,\n"
        "    mark_create_study_onboarding_skipped,\n"
        ")\n",
    )

old_validate = '''@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_token(request: ValidateTokenRequest):
    """
    Fast token validation (no DB) - validates access token, optionally refreshes if expired.
    Returns in ~10ms.
    """
    payload = verify_token(request.access_token, "access")
    if payload:
        return ValidateTokenResponse(
            valid=True,
            user_id=payload.get("sub"),
            email=payload.get("email"),
        )
    if request.refresh_token:
        refreshed = refresh_access_token(request.refresh_token)
        if refreshed:
            sub = verify_token(refreshed["access_token"], "access")
            return ValidateTokenResponse(
                valid=True,
                access_token=refreshed["access_token"],
                user_id=sub.get("sub") if sub else None,
                email=sub.get("email") if sub else None,
            )
    return ValidateTokenResponse(
        valid=False,
        error="Invalid or expired token",
    )'''

new_validate = '''def _validate_token_response(
    db: Session,
    *,
    user_id: str | None,
    email: str | None,
    access_token: str | None = None,
) -> ValidateTokenResponse:
    onboarding = get_onboarding_status_for_user_id(db, user_id) if user_id else OnboardingStatusResponse()
    return ValidateTokenResponse(
        valid=True,
        access_token=access_token,
        user_id=user_id,
        email=email,
        onboarding_completed=onboarding.onboarding_completed,
        onboarding_skipped=onboarding.onboarding_skipped,
        create_study_onboarding_completed=onboarding.create_study_onboarding_completed,
        create_study_onboarding_skipped=onboarding.create_study_onboarding_skipped,
        show_dashboard_onboarding=onboarding.show_dashboard_onboarding,
        show_create_study_onboarding=onboarding.show_create_study_onboarding,
    )


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_token(request: ValidateTokenRequest, db: Session = Depends(get_db)):
    """
    Validate access token and return onboarding status for the authenticated user.
    """
    payload = verify_token(request.access_token, "access")
    if payload:
        return _validate_token_response(
            db,
            user_id=payload.get("sub"),
            email=payload.get("email"),
        )
    if request.refresh_token:
        refreshed = refresh_access_token(request.refresh_token)
        if refreshed:
            sub = verify_token(refreshed["access_token"], "access")
            return _validate_token_response(
                db,
                user_id=sub.get("sub") if sub else None,
                email=sub.get("email") if sub else None,
                access_token=refreshed["access_token"],
            )
    return ValidateTokenResponse(
        valid=False,
        error="Invalid or expired token",
    )'''

if old_validate in api_text:
    api_text = api_text.replace(old_validate, new_validate)

endpoints = '''

@router.post("/onboarding/dashboard/complete", response_model=OnboardingStatusResponse)
async def complete_dashboard_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    mark_dashboard_onboarding_complete(db, current_user)
    return build_onboarding_status(current_user)


@router.post("/onboarding/dashboard/skip", response_model=OnboardingStatusResponse)
async def skip_dashboard_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    mark_dashboard_onboarding_skipped(db, current_user)
    return build_onboarding_status(current_user)


@router.post("/onboarding/create-study/complete", response_model=OnboardingStatusResponse)
async def complete_create_study_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    mark_create_study_onboarding_complete(db, current_user)
    return build_onboarding_status(current_user)


@router.post("/onboarding/create-study/skip", response_model=OnboardingStatusResponse)
async def skip_create_study_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    mark_create_study_onboarding_skipped(db, current_user)
    return build_onboarding_status(current_user)
'''

if "/onboarding/dashboard/complete" not in api_text:
    api_text = api_text.rstrip() + endpoints + "\n"

user_api.write_text(api_text, encoding="utf-8")
print("patched onboarding service and user API")
