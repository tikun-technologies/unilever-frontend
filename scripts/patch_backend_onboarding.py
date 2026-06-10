from pathlib import Path

ROOT = Path(r"D:\TikunTech\uniliverimagestudy")

migration = ROOT / "alembic/versions/20260609_add_user_onboarding_fields.py"
migration.write_text(
    '''"""add user onboarding fields

Revision ID: 20260609_user_onboarding
Revises: 20260607_saved_designs_type
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260609_user_onboarding"
down_revision: Union[str, Sequence[str], None] = "20260607_saved_designs_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {col["name"] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    for column in (
        "dashboard_onboarding_completed",
        "dashboard_onboarding_skipped",
        "create_study_onboarding_completed",
        "create_study_onboarding_skipped",
    ):
        if not _column_exists(bind, "users", column):
            op.add_column(
                "users",
                sa.Column(column, sa.Boolean(), nullable=False, server_default=sa.false()),
            )


def downgrade() -> None:
    bind = op.get_bind()
    for column in (
        "create_study_onboarding_skipped",
        "create_study_onboarding_completed",
        "dashboard_onboarding_skipped",
        "dashboard_onboarding_completed",
    ):
        if _column_exists(bind, "users", column):
            op.drop_column("users", column)
''',
    encoding="utf-8",
)

model = ROOT / "app/models/user_model.py"
text = model.read_text(encoding="utf-8")
old = """    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps"""
new = """    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    dashboard_onboarding_completed = Column(Boolean, default=False, nullable=False)
    dashboard_onboarding_skipped = Column(Boolean, default=False, nullable=False)
    create_study_onboarding_completed = Column(Boolean, default=False, nullable=False)
    create_study_onboarding_skipped = Column(Boolean, default=False, nullable=False)

    # Timestamps"""
if old in text:
    model.write_text(text.replace(old, new), encoding="utf-8")

schema = ROOT / "app/schemas/user_schema.py"
stext = schema.read_text(encoding="utf-8")
old_resp = """class UserResponse(BaseModel):
    \"\"\"Schema for user response (without sensitive data)\"\"\"
    id: uuid.UUID
    email: str
    name: str
    phone: Optional[str]
    date_of_birth: Optional[datetime]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True"""
new_resp = """class UserResponse(BaseModel):
    \"\"\"Schema for user response (without sensitive data)\"\"\"
    id: uuid.UUID
    email: str
    name: str
    phone: Optional[str]
    date_of_birth: Optional[datetime]
    is_active: bool
    is_verified: bool
    dashboard_onboarding_completed: bool = False
    dashboard_onboarding_skipped: bool = False
    create_study_onboarding_completed: bool = False
    create_study_onboarding_skipped: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class OnboardingStatusResponse(BaseModel):
    \"\"\"Computed onboarding flags for clients.\"\"\"
    onboarding_completed: bool = False
    onboarding_skipped: bool = False
    create_study_onboarding_completed: bool = False
    create_study_onboarding_skipped: bool = False
    show_dashboard_onboarding: bool = True
    show_create_study_onboarding: bool = True"""
if old_resp in stext:
    schema.write_text(stext.replace(old_resp, new_resp), encoding="utf-8")

print("patched migration, model, schema")
