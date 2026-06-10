from pathlib import Path

ROOT = Path(r"D:\TikunTech\uniliverimagestudy")

onboarding = ROOT / "app/services/onboarding.py"
text = onboarding.read_text(encoding="utf-8")
if "def reset_user_onboarding" not in text:
    text = text.rstrip() + """


def reset_user_onboarding(db: Session, user: User) -> User:
    user.dashboard_onboarding_completed = False
    user.dashboard_onboarding_skipped = False
    user.create_study_onboarding_completed = False
    user.create_study_onboarding_skipped = False
    db.commit()
    db.refresh(user)
    return user
"""
    onboarding.write_text(text, encoding="utf-8")

user_api = ROOT / "app/api/v1/user.py"
api = user_api.read_text(encoding="utf-8")
if "mark_create_study_onboarding_skipped," in api and "reset_user_onboarding" not in api:
    api = api.replace(
        "    mark_create_study_onboarding_skipped,\n)",
        "    mark_create_study_onboarding_skipped,\n    reset_user_onboarding,\n)",
    )

if "/onboarding/reset" not in api:
    api = api.rstrip() + """


@router.post("/onboarding/reset", response_model=OnboardingStatusResponse)
async def reset_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    user = reset_user_onboarding(db, current_user)
    return build_onboarding_status(user)
"""
    user_api.write_text(api, encoding="utf-8")

print("backend reset onboarding patched")
