class Agent365Adapter:
    """
    Agent365 adapter placeholder.

    Replace TODOs with concrete imports and calls from the official Agent365 SDK.
    """

    def __init__(self, config: dict):
        self.config = config
        # TODO: Initialize your Agent365 SDK client here.

    async def report_turn_start(self, context: dict) -> dict:
        # TODO: Map to SDK event/logging API.
        return {"turnId": context["turn_id"], "status": "started"}

    async def report_purview_decision(self, context: dict, stage: str, decision: dict) -> dict:
        # TODO: Map to SDK event/logging API.
        return {"turnId": context["turn_id"], "stage": stage, "decision": decision}

    async def report_turn_end(self, context: dict, result: dict) -> dict:
        # TODO: Map to SDK event/logging API.
        return {"turnId": context["turn_id"], "status": "completed", "result": result}
