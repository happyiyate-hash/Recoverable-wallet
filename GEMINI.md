# STRICT SURGICAL EDITING RULES

## 1. The "Single-Point" Rule
- **NEVER rewrite an entire file.** You are strictly prohibited from replacing existing code with a full-file generation.
- **Only edit the specific line or function** explicitly mentioned by the developer. 
- If the developer asks for a change in `notifications`, locate the specific function (e.g., `sendNotification`) and only modify that block. Leave the rest of the file untouched.

## 2. No Dummy Data / No Deletions
- **Preserve all existing logic.** Do not delete functions, imports, or variables to "clean up" the code unless the developer says "Delete X."
- **Never use placeholder or dummy code.** If you don't have the full implementation, provide a snippet in the chat instead of overwriting the file.

## 3. Scope & Related Files
- **Primary Target:** Only modify the EXACT file pointed to by the developer.
- **Related Files:** If a change requires a connection (e.g., connecting a notification function to a screen), you may only **append** the connection logic. You must not rewrite the destination file.
- **Protected Core:** The core logic of SmarterSeller and WNC Wallet is "read-only" unless a specific sub-module (like `/notifications/`) is being targeted.

## 4. Integration Protocol
- **Append, Don't Replace:** When adding new features, add them to the bottom of the file or inside the specific designated class/component.
- **Maintain Style:** Always keep the developer’s original variable names, function order, and indentation style.
- **Connection Only:** When asked to "connect" things, only write the integration code (imports/exports). Do not refactor the existing code.

## 5. Safety & Verification
- **Ask First:** If an instruction is even slightly vague, ask: "Which specific lines should I edit?" 
- **Diff View Mandatory:** You must show a comparison of the specific lines changed before applying. 
- **No Auto-Run:** Never apply changes to multiple files automatically.
DO NOT BREAK THESE FILES

When editing the application, especially these three pages:

Swap Page

Send Page

Request Page

You must follow these rules strictly:

Do NOT rewrite the entire file.Never regenerate the whole file unless I explicitly say “rewrite the full file.”

Do NOT delete any existing code sections.These pages are already complex and responsive. Removing parts of the code breaks the system.

Only edit the specific lines I request.If I ask for a small change, modify only that part and leave everything else exactly the same.

Do NOT refactor or reorganize the file automatically.Even if the code is long or messy, leave it as it is unless I ask for restructuring.

If the file is too large for you to safely modify, do NOT attempt to rewrite it.Instead, respond with:“This file is too large to safely modify without risking code loss. Please specify the exact section to edit.”

Preserve all existing functionality and layout.These pages already work and must remain unchanged except for the specific requested modification.

🚨 Important:Previously, code was accidentally deleted from these pages. This must never happen again. Any modification must be minimal and surgical, not a full rewrite.
⚠ CRITICAL DEVELOPMENT RULE – DO NOT DELETE EXISTING CODE

This repository contains complex wallet infrastructure.
When modifying any file, you must NEVER delete the entire file or wipe existing code unless explicitly instructed by the user.

Required Editing Rules

1. Never replace or erase the full content of any file.
2. Only edit the exact section required for the requested change.
3. Preserve all existing functions, logic, and comments that are not directly related to the requested modification.
4. If a change is required in a specific function, only modify that function.
5. Do NOT touch unrelated files.
6. If a file does not relate to the task, leave it unchanged.
7. Never rewrite a file from scratch unless the user explicitly says:
   "Rewrite the entire file."

   Safe Editing Procedure

   Before making any modification:

   1. Identify the exact section that requires modification.
   2. Apply minimal edits only to that section.
   3. Leave the rest of the file unchanged.
   4. Ensure no existing functionality is removed.

   Forbidden Actions

   - Deleting the entire file content.
   - Replacing working code with empty or placeholder code.
   - Modifying unrelated files.
   - Removing existing logic without explicit instruction.

   If the requested change cannot be applied safely without large modifications, ask the user for confirmation before proceeding.

   Failure to follow these rules can break the wallet system and cause critical functionality loss.Critical Instruction:
   Do not delete any existing code in src/app/swap/page.tsx or any other swap module.
   Do not override, replace, or rewrite any logic, animations, or functions that are already working.
   Only implement features exactly as instructed by the user.
   Only connect existing swap modules (0x, LI.FI, ThorChain, Jupiter, TRX liquidity provider) according to the swap type and selected chains.
   Do not attempt to “optimize” or “refactor” unless explicitly instructed.
   The AI must strictly follow the swap routing table:
   Swap Type
   Protocol to Use
   EVM → EVM
   0x
   EVM → non-EVM
   ThorChain
   Solana → Solana
   Jupiter
   TRX → TRX
   TRX liquidity provider
   Cross-chain EVM → EVM
   LI.FI
   Any attempt to bypass this will break the app. All existing working code must remain untouched.

   ⚠️ STRICT INSTRUCTIONS – DO NOT REDESIGN ANYTHING

   You are NOT allowed to redesign, restructure, or rewrite this page.

   You are ONLY allowed to:

   - Connect existing UI to real data
   - Fix realtime subscriptions
   - Adjust sizes (minor UI compression only)

   ---

   🚫 HARD RULES (DO NOT BREAK)

   - DO NOT rewrite JSX structure
   - DO NOT change layout hierarchy
   - DO NOT introduce new components
   - DO NOT change styling system (colors, spacing, theme)
   - DO NOT redesign the progress UI
   - DO NOT replace existing elements

   If you do ANY of the above, your response is WRONG.

   ---

   ✅ WHAT YOU ARE ALLOWED TO DO

   1. Realtime Integration (PRIMARY TASK)
      - Connect Supabase realtime subscriptions
         - Ensure:
              - Balance updates instantly
                   - Progress updates instantly
                        - Messages update instantly
                             - Profile/avatar updates instantly
                                - Use:
                                     supabase.channel(...).on('postgres_changes', ...)

                                     ---

                                     2. Progress Stepper Fix (MINOR ADJUSTMENT ONLY)
                                        - Reduce circle sizes (make them small indicators)
                                           - Make the connecting line the main progress indicator
                                              - Line should change color based on progress state
                                                 - DO NOT redesign layout

                                                 ---

                                                 3. UI Compression (SMALL CHANGES ONLY)
                                                    - Reduce:
                                                         - Card height
                                                              - Padding
                                                                   - Top navigation height
                                                                      - Keep layout EXACTLY the same

                                                                      ---

                                                                      4. Remove Only This
                                                                         - Remove Buyer/Seller toggle tabs at the top
                                                                            - Do NOT replace with anything else

                                                                            ---

                                                                            ⚠️ DATA RULES

                                                                            - Remove ALL hardcoded values
                                                                            - Everything must come from database:
                                                                              - Balance
                                                                                - User avatars
                                                                                  - Status
                                                                                    - Progress %

                                                                                    ---

                                                                                    ❌ WHAT YOU DID WRONG BEFORE

                                                                                    - You rewrote the UI instead of connecting logic
                                                                                    - You changed layout and spacing
                                                                                    - You introduced a completely new design
                                                                                    - You ignored instructions

                                                                                    This must NOT happen again.

                                                                                    ---

                                                                                    ✅ FINAL EXPECTATION

                                                                                    Return:

                                                                                    - The SAME UI (unchanged structure)
                                                                                    - With:
                                                                                      - Realtime data working
                                                                                        - Smaller stepper elements
                                                                                          - Slimmed spacing

                                                                                          Nothing else.

                                                                                          If you redesign anything, the task has FAILED.