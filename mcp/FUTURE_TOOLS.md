# FUTURE tools (not implemented)

Nothing in this file is registered as an MCP tool. Calling one of these names
returns an unknown-tool error, because a stub that returns a plausible-looking
answer is worse than a missing tool. Each group names the module that already
holds the logic a future phase would wrap.

## ICM
Source: `backend/app/icm/icm_engine.py`, `backend/app/equity/equity_engine.py`

| Tool | Purpose |
| --- | --- |
| `calculate_icm` | ICM equities for the current stacks and payouts |
| `calculate_equity` | all-in equity for given ranges and board |
| `calculate_ev` | expected value of a decision against a range |
| `calculate_bubble_pressure` | bubble factor and risk premium |

## Tournament
Source: `backend/app/tournament/tournament.py`, `backend/app/tournament/blind_structure.py`

| Tool | Purpose |
| --- | --- |
| `get_tournament_state` | stacks, blinds, level, players left |
| `get_blind_level` | current and next blind level with timing |
| `get_stack_information` | every stack in chips and big blinds |
| `calculate_effective_stack` | effective stack between two seats |

## Coach
Source: `backend/app/services/session_coach.py`, `backend/app/services/hand_review.py`

| Tool | Purpose |
| --- | --- |
| `analyze_hand` | review one played hand |
| `get_correct_action` | the action the ranges support |
| `explain_icm_reasoning` | the reasoning behind an ICM decision |
| `generate_training_hand` | a practice spot for a chosen lesson |

## Database
Source: `backend/app/database/session.py`, `backend/app/services/hand_history.py`

| Tool | Purpose |
| --- | --- |
| `get_user_session` | session metadata for one user, never a token |
| `get_hand_history` | stored hands for a user or table |
| `get_tournament_configuration` | the settings a tournament ran with |

The machine-readable copy of this catalogue is `planned_tools.py`, exposed by
the read-only tool `list_planned_tools`.
