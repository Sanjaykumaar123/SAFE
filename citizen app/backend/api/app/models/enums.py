"""
Status / type constants shared by every model, schema, and route.

Nothing in this codebase should hardcode a raw status string — import from
here instead (mirrors `apps/citizen-mobile/constants/hazardStatus.ts` etc. on
the mobile side, and `packages/config` as the documented source of truth for
future Admin/Municipality/Fleet apps).
"""
import enum


class HazardStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    ACTIVE = "ACTIVE"
    UNDER_REPAIR = "UNDER_REPAIR"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"
    # Added for the Municipality app (section 42/64): a RESOLVED hazard whose
    # road later shows new deterioration. Deliberately NOT the same as
    # ACTIVE — the municipality UI needs to say "previously resolved, new
    # damage detected" rather than presenting it as a fresh report. The
    # fine-grained repair workflow (assigned/in-progress/ready-for-inspection)
    # deliberately does *not* add more values here — see `RepairStatus`
    # below and `app/models/repair.py`. Overloading `hazards.status` with
    # every repair-workflow step would mean any status this backend didn't
    # exist for a citizen app is not equipped to have on a "nearby hazard"
    # response — `hazards.status` stays coarse (ACTIVE / UNDER_REPAIR /
    # RESOLVED) on purpose so nothing here is a breaking change for it;
    # `repairs.status` on the linked Repair carries the detail a municipal
    # officer needs.
    REOPENED = "REOPENED"


# Statuses that still count as "current" on the live map / nearby queries.
ACTIVE_HAZARD_STATUSES = (
    HazardStatus.REPORTED,
    HazardStatus.UNDER_REVIEW,
    HazardStatus.VERIFIED,
    HazardStatus.ACTIVE,
    HazardStatus.UNDER_REPAIR,
    HazardStatus.REOPENED,
)

# Statuses excluded from the *default* municipality hazard list (i.e. what
# "ACTIVE" means in the Municipality UI's status filter) — same set, named
# for that call site so it reads clearly there too.
MUNICIPALITY_ACTIVE_HAZARD_STATUSES = ACTIVE_HAZARD_STATUSES


class HazardType(str, enum.Enum):
    POTHOLE = "POTHOLE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    FLOODING = "FLOODING"
    DEBRIS = "DEBRIS"
    BROKEN_PAVEMENT = "BROKEN_PAVEMENT"
    OTHER = "OTHER"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HazardSource(str, enum.Enum):
    CITIZEN_REPORT = "CITIZEN_REPORT"
    FLEET_OBSERVATION = "FLEET_OBSERVATION"
    MUNICIPALITY = "MUNICIPALITY"
    ADMIN = "ADMIN"


class NotificationType(str, enum.Enum):
    NEARBY_HAZARD = "NEARBY_HAZARD"
    REPORT_UPDATE = "REPORT_UPDATE"
    ROAD_RESOLVED = "ROAD_RESOLVED"
    CRITICAL_HAZARD = "CRITICAL_HAZARD"
    SYSTEM = "SYSTEM"


class SavedLocationLabel(str, enum.Enum):
    HOME = "HOME"
    WORK = "WORK"
    COLLEGE = "COLLEGE"
    CUSTOM = "CUSTOM"


class AIProvider(str, enum.Enum):
    MOCK = "MOCK"
    YOLOV8 = "YOLOV8"


class MediaKind(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"


# =====================================================================
# Municipality app enums (see backend/api/app/models/repair.py,
# app/services/municipality/*, app/api/v1/municipality/*).
# =====================================================================


class RepairStatus(str, enum.Enum):
    """The fine-grained workflow `hazards.status` intentionally does not
    carry (see the comment on `HazardStatus.REOPENED` above)."""

    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    READY_FOR_INSPECTION = "READY_FOR_INSPECTION"
    REWORK_REQUIRED = "REWORK_REQUIRED"
    RESOLVED = "RESOLVED"


# Repair statuses that still represent an open/in-flight repair — used to
# enforce "one active repair per hazard at a time" (section 54).
OPEN_REPAIR_STATUSES = (
    RepairStatus.ASSIGNED,
    RepairStatus.IN_PROGRESS,
    RepairStatus.READY_FOR_INSPECTION,
    RepairStatus.REWORK_REQUIRED,
)


class RepairPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class VerificationState(str, enum.Enum):
    """Computed (never stored) road-condition decision-support output — see
    `app/services/municipality/verification.py` (section 27)."""

    STILL_ACTIVE = "STILL_ACTIVE"
    PROBABLY_CLEAR = "PROBABLY_CLEAR"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    CONFIRMED_CLEAR = "CONFIRMED_CLEAR"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ObservationState(str, enum.Enum):
    DETECTED = "DETECTED"
    CLEAR = "CLEAR"


class VerificationMethod(str, enum.Enum):
    MUNICIPAL_INSPECTION = "MUNICIPAL_INSPECTION"
    FLEET_REVALIDATION = "FLEET_REVALIDATION"
    COMBINED = "COMBINED"


class InspectionDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REWORK_REQUESTED = "REWORK_REQUESTED"


class MunicipalityOfficerRole(str, enum.Enum):
    """Section 09 — MVP grants the same permission set to all of these
    (see `DEFAULT_PERMISSIONS_BY_ROLE`); kept distinct now so the mobile
    profile screen and future per-role permission tuning have something
    real to read instead of a single flat role string."""

    MUNICIPALITY_OFFICER = "MUNICIPALITY_OFFICER"
    ROAD_SUPERVISOR = "ROAD_SUPERVISOR"
    MAINTENANCE_OFFICER = "MAINTENANCE_OFFICER"
    INSPECTOR = "INSPECTOR"
    MUNICIPALITY_ADMIN = "MUNICIPALITY_ADMIN"


class MunicipalityPermission(str, enum.Enum):
    """Never hardcoded in the mobile UI (section 08) — the backend issues
    the permission list at login/`/municipality/me` and every mutating
    route re-checks it server-side; the client only uses it to decide what
    to *show*."""

    VIEW_HAZARDS = "VIEW_HAZARDS"
    ASSIGN_REPAIR = "ASSIGN_REPAIR"
    UPDATE_REPAIR = "UPDATE_REPAIR"
    INSPECT_HAZARD = "INSPECT_HAZARD"
    RESOLVE_HAZARD = "RESOLVE_HAZARD"
    VIEW_ANALYTICS = "VIEW_ANALYTICS"
    MANAGE_OFFICERS = "MANAGE_OFFICERS"


# =====================================================================
# Fleet Operator app enums (see backend/api/app/models/{vehicle,
# fleet_operator_profile,collection_session,earning_record}.py,
# app/services/fleet/*, app/api/v1/fleet/*).
# =====================================================================


class FleetOperatorRole(str, enum.Enum):
    DRIVER = "DRIVER"
    FLEET_ADMIN = "FLEET_ADMIN"


class FleetPermission(str, enum.Enum):
    """Never hardcoded in the mobile UI — same rule as
    `MunicipalityPermission`: issued at login/`/fleet/me`, re-checked
    server-side on every mutating route."""

    SUBMIT_OBSERVATION = "SUBMIT_OBSERVATION"
    VIEW_EARNINGS = "VIEW_EARNINGS"
    MANAGE_VEHICLE = "MANAGE_VEHICLE"


DEFAULT_FLEET_PERMISSIONS_BY_ROLE: dict[str, list[str]] = {
    FleetOperatorRole.DRIVER.value: [
        FleetPermission.SUBMIT_OBSERVATION.value,
        FleetPermission.VIEW_EARNINGS.value,
    ],
    FleetOperatorRole.FLEET_ADMIN.value: [p.value for p in FleetPermission],
}


class VehicleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"


class CollectionSessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    VALIDATED = "VALIDATED"
    PARTIALLY_VALIDATED = "PARTIALLY_VALIDATED"


class EarningStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PAID = "PAID"


# Section 09: MVP grants every municipality role the same operational
# permission set (view/filter/assign/track/inspect/resolve). Per-role
# narrowing is a config change here, not a mobile-app change.
DEFAULT_PERMISSIONS_BY_ROLE: dict[str, list[str]] = {
    MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value: [
        MunicipalityPermission.VIEW_HAZARDS.value,
        MunicipalityPermission.ASSIGN_REPAIR.value,
        MunicipalityPermission.UPDATE_REPAIR.value,
        MunicipalityPermission.INSPECT_HAZARD.value,
        MunicipalityPermission.RESOLVE_HAZARD.value,
        MunicipalityPermission.VIEW_ANALYTICS.value,
    ],
    MunicipalityOfficerRole.ROAD_SUPERVISOR.value: [
        MunicipalityPermission.VIEW_HAZARDS.value,
        MunicipalityPermission.ASSIGN_REPAIR.value,
        MunicipalityPermission.UPDATE_REPAIR.value,
        MunicipalityPermission.VIEW_ANALYTICS.value,
    ],
    MunicipalityOfficerRole.MAINTENANCE_OFFICER.value: [
        MunicipalityPermission.VIEW_HAZARDS.value,
        MunicipalityPermission.UPDATE_REPAIR.value,
    ],
    MunicipalityOfficerRole.INSPECTOR.value: [
        MunicipalityPermission.VIEW_HAZARDS.value,
        MunicipalityPermission.INSPECT_HAZARD.value,
        MunicipalityPermission.RESOLVE_HAZARD.value,
    ],
    MunicipalityOfficerRole.MUNICIPALITY_ADMIN.value: [p.value for p in MunicipalityPermission],
}
