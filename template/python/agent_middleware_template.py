"""
Generic middleware shape for Python host runtimes.

`next_fn(context)` should execute the model turn and return:
{"output_text": "...", ...}
"""


def create_governed_agent_middleware(purview, agent365, config):
    async def governed_turn(context: dict, next_fn):
        user_id = context.get("user_id") or config.get("default_user_id")
        if not user_id:
            raise ValueError("Missing user_id in context and default_user_id in config.")

        await agent365.report_turn_start(context)

        incoming_authorization_header = context.get("authorization_header", "")
        scopes = await purview.compute_protection_scopes(
            user_id, incoming_authorization_header
        )
        context["purview_scopes"] = scopes

        inbound_result = await purview.evaluate_content(
            user_id=user_id,
            activity="uploadText",
            content=context["input_text"],
            context_id=context["turn_id"],
            incoming_authorization_header=incoming_authorization_header,
        )
        inbound_decision = purview.get_enforcement_decision(inbound_result)
        await agent365.report_purview_decision(context, "pre-model", inbound_decision)

        if inbound_decision["block"]:
            blocked = {"blocked": True, "reason": "Purview policy blocked inbound content."}
            await agent365.report_turn_end(context, blocked)
            return blocked

        model_result = await next_fn(context)

        outbound_result = await purview.evaluate_content(
            user_id=user_id,
            activity="downloadText",
            content=model_result["output_text"],
            context_id=context["turn_id"],
            incoming_authorization_header=incoming_authorization_header,
        )
        outbound_decision = purview.get_enforcement_decision(outbound_result)
        await agent365.report_purview_decision(context, "post-model", outbound_decision)

        if outbound_decision["block"]:
            blocked = {"blocked": True, "reason": "Purview policy blocked outbound content."}
            await agent365.report_turn_end(context, blocked)
            return blocked

        await agent365.report_turn_end(context, model_result)
        return model_result

    return governed_turn
