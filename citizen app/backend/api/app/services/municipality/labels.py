"""Friendly labels for `MunicipalityAction.action_type` — the one place the
dashboard's "recent activity" feed and a hazard's timeline turn an internal
action_type string into copy a human reads (section 16)."""

ACTION_LABELS: dict[str, str] = {
    "HAZARD_CREATED": "New hazard detected",
    "CRITICAL_HAZARD": "New critical hazard detected",
    "REPORT_VERIFIED": "Citizen report verified",
    "FLEET_UPDATE": "Fleet observation updated",
    "REPAIR_ASSIGNED": "Repair assigned",
    "REPAIR_PROGRESS": "Repair progress updated",
    "READY_FOR_INSPECTION": "Road marked ready for inspection",
    "INSPECTION_APPROVED": "Inspection approved — hazard resolved",
    "INSPECTION_REWORK": "Inspection requested rework",
    "HAZARD_RESOLVED": "Hazard resolved",
    "HAZARD_REOPENED": "Hazard reopened — new deterioration detected",
}


def label_for(action_type: str) -> str:
    return ACTION_LABELS.get(action_type, action_type.replace("_", " ").title())
