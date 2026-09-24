"""Minimal uploadable Python bot for AlgoPoker @ GT."""

import json
import sys


def choose_action(observation: dict) -> dict:
    """Return one legal action for the current game state."""
    legal = observation["legal_actions"]

    # YOUR JOB: Replace this check/call strategy with your own logic.
    # Useful inputs include observation["hole_cards"], observation["board"],
    # observation["pot_total"], observation["stacks"], and
    # observation["action_history"].
    if legal["can_check"]:
        return {"action": "check"}
    if legal["can_call"]:
        return {"action": "call"}
    return {"action": "fold"}


# DO NOT CHANGE BELOW. IT WILL ABSOLUTELY BREAK YOUR BOT. PLS AND THANK YOU
def main() -> None:
    for line in sys.stdin:
        try:
            observation = json.loads(line)
            action = choose_action(observation)
        except Exception as error:
            print(f"bot error: {error}", file=sys.stderr, flush=True)
            action = {"action": "fold"}
        print(json.dumps(action, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()

