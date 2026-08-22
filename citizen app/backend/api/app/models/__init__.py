"""
Import every model so `Base.metadata` is fully populated for Alembic
autogenerate and `Base.metadata.create_all` (tests). Order doesn't matter —
each model file resolves its own forward-ref imports.
"""
from app.models.ai_analysis import AIAnalysis
from app.models.audit_log import AuditLog
from app.models.citizen_profile import CitizenProfile
from app.models.citizen_report import CitizenReport
from app.models.city import City
from app.models.collection_session import CollectionSession
from app.models.device_token import DeviceToken
from app.models.earning_record import EarningRecord
from app.models.fleet_observation import FleetObservation
from app.models.fleet_operator_profile import FleetOperatorProfile
from app.models.hazard import Hazard
from app.models.hazard_media import HazardMedia
from app.models.hazard_verification import HazardVerification
from app.models.inspection import Inspection
from app.models.municipality import Municipality, MunicipalityCityAccess
from app.models.municipality_action import MunicipalityAction
from app.models.municipality_profile import MunicipalityProfile
from app.models.notification import Notification
from app.models.repair import Repair
from app.models.repair_progress import RepairProgress
from app.models.report_media import ReportMedia
from app.models.report_status_history import ReportStatusHistory
from app.models.resolution import Resolution
from app.models.road import Road
from app.models.saved_location import SavedLocation
from app.models.user import User
from app.models.user_session import UserSession
from app.models.vehicle import Vehicle
from app.models.ward import Ward

__all__ = [
    "AIAnalysis",
    "AuditLog",
    "CitizenProfile",
    "CitizenReport",
    "City",
    "CollectionSession",
    "DeviceToken",
    "EarningRecord",
    "FleetObservation",
    "FleetOperatorProfile",
    "Hazard",
    "HazardMedia",
    "HazardVerification",
    "Inspection",
    "Municipality",
    "MunicipalityCityAccess",
    "MunicipalityAction",
    "MunicipalityProfile",
    "Notification",
    "Repair",
    "RepairProgress",
    "ReportMedia",
    "ReportStatusHistory",
    "Resolution",
    "Road",
    "SavedLocation",
    "User",
    "UserSession",
    "Vehicle",
    "Ward",
]
