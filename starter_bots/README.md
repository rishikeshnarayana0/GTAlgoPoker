# Starter bots

The starter source files are minimal calling bots. They read one JSON **observation**
from standard input whenever it is their turn, then print one JSON action to standard
output. An observation is the complete information your bot is allowed to use for
that decision: your private cards plus public table state. It never contains another
player's hole cards or undealt cards.

## Files

- `python/bot.py` — Python starter
- `cpp/main.cpp` — C++20 starter
- `rust/main.rs` — Rust starter
- `zips/` — packaged copies for local tooling; the website currently accepts a
  single `.py`, `.cpp`/`.cc`, or `.rs` source file.

## Observation format

Every observation is a JSON object like this (values are examples):

```json
{
  "hand_number": 18,
  "player_id": "seat-2",
  "street": "flop",
  "button_seat": 0,
  "small_blind": 10,
  "big_blind": 20,
  "ante": 2,
  "small_blind_player_id": "seat-1",
  "big_blind_player_id": "seat-2",
  "current_player_id": "seat-2",
  "board": ["Ah", "7c", "2d"],
  "hole_cards": ["Ks", "Qh"],
  "pot_total": 146,
  "current_bet": 60,
  "players": [{"player_id":"seat-0","seat":0,"stack":938,"status":"active","committed_total":62,"committed_street":60}],
  "action_history": [{"street":"preflop","player_id":"seat-0","action":"raise","amount":60,"raise_to":60,"full_raise":true}],
  "legal_actions": {"player_id":"seat-2","can_fold":true,"can_check":false,"can_call":true,"call_amount":40,"can_raise":true,"min_raise_to":100,"max_raise_to":998}
}
```

### Hand and position

| Field | Meaning |
| --- | --- |
| `hand_number` | Number of the current hand in the tournament. |
| `player_id` | Your bot's ID. IDs are `seat-0` through `seat-5`. |
| `street` | `preflop`, `flop`, `turn`, or `river`. |
| `button_seat` | Seat holding the dealer button this hand. |
| `small_blind`, `big_blind`, `ante` | Current forced-bet amounts. They rise during the tournament. |
| `small_blind_player_id`, `big_blind_player_id` | Players assigned those blinds this hand. |
| `current_player_id` | Player currently required to act. It is your ID for every observation sent to your process. |

### Cards and money

| Field | Meaning |
| --- | --- |
| `hole_cards` | Your two private cards. Cards use `2`–`9`, `T`, `J`, `Q`, `K`, `A` and `c`, `d`, `h`, `s`; for example, `"As"`. |
| `board` | Public community cards already dealt. It has 0 cards preflop, then 3, 4, and 5. |
| `pot_total` | Total chips already in all pots. |
| `current_bet` | Largest total contribution any player has made on the current street. |
| `players` | One public record per seat. `stack` is chips not yet committed; `status` is `active`, `folded`, or `all_in`; `committed_street` is that player's total contribution on this street; `committed_total` is their total contribution for the whole hand. |

### Previous actions

`action_history` contains every voluntary action earlier in the current hand.
Each item identifies its `street`, acting player, action (`fold`, `check`,
`call`, or `raise`), and applicable sizing. For a raise, `raise_to` is the
player's total contribution on that street—not the additional chips placed in
the pot. `full_raise` tells you whether the raise reopened betting.

### Legal actions

Always use `legal_actions` to decide what you may return.

| Field | Meaning |
| --- | --- |
| `can_fold`, `can_check`, `can_call`, `can_raise` | Whether each response is legal right now. |
| `call_amount` | Additional chips required to call. It is `0` when checking is available. |
| `min_raise_to`, `max_raise_to` | Inclusive legal bounds for a raise-to amount; they are `null` when raising is unavailable. |

Respond with exactly one line of JSON:

```json
{"action":"fold"}
{"action":"check"}
{"action":"call"}
{"action":"raise","amount":100}
```

For a raise, `amount` must be an integer between `min_raise_to` and
`max_raise_to`, inclusive. It is a **raise-to** amount. If a bot times out,
crashes, prints invalid JSON, or attempts an illegal action, the runner records
a fault and substitutes a safe action for that decision.

## Important constraints

- Return one action within four seconds.
- Print JSON actions only to standard output. Send debugging output to standard
  error.
- Your process persists for the entire match, so you may keep your own history
  in memory. Only turn observations are sent; do not expect a separate hand-start
  or hand-end message.
- Python runs in isolated mode; C++ is compiled as C++20; Rust is compiled with
  `rustc -O`.
- Submissions have no inbound network access, no AWS credentials, and a
  temporary read-only filesystem.
