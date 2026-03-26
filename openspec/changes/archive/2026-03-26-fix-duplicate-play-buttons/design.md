## Context

`processTextElements()` wraps each qualifying text node in a `<span class="talkient-processed">` that contains a play button and a text `<span>`. When settings change or `RELOAD_PLAY_BUTTONS` is received, `content.ts` calls `removeTalkientUiElements()` then `processTextElements()` again.

`removeTalkientUiElements()` currently:
1. Removes `.talkient-play-button` elements
2. Removes the `talkient-processed` **class** from wrapper spans — but leaves the wrapper `<span>` elements in the DOM

Because the wrapper spans remain (now without the class), on the next `processTextElements()` call the `TreeWalker` encounters the text nodes inside them, `shouldProcessNode()` passes (parent no longer has `.talkient-processed`), and a second button is injected. Each settings change stacks one more button — explaining the observed 5 buttons.

Additionally, the screenshot shows nested `.talkient-processed` spans, indicating the wrapper-of-a-wrapper case is also possible when the text node itself has already been moved inside a `<span>` child of the wrapper.

## Goals / Non-Goals

**Goals:**
- Guarantee that a text element never receives more than one play button, regardless of how many times `processTextElements()` is called
- Fix `removeTalkientUiElements()` to fully undo the DOM mutations made during processing (unwrap spans, restore original text nodes)
- Add a fast-path guard in `shouldProcessNode()` so the wrapper ancestry check is always the first thing checked

**Non-Goals:**
- Changing the batch/rAF processing strategy
- Adding a MutationObserver (intentionally disabled)
- Modifying button styles or positioning logic

## Decisions

### Decision 1: Unwrap spans in `removeTalkientUiElements()` instead of just removing the class

**Chosen:** Replace the class-removal loop with a proper unwrap that moves child text nodes back to their original parent and removes the wrapper span.

**Why:** The wrapper span is the root of the problem. Removing only the class leaves a structurally mutated DOM; on the next pass the guards are bypassed. A full unwrap restores the DOM to its pre-processing state, making re-processing idempotent.

**Alternative considered:** Keep wrapper spans but re-add the class before re-processing. Rejected: adds fragile state synchronization; class could be stripped by the page itself or other extensions.

### Decision 2: Add ancestry check at the top of `shouldProcessNode()`

**Chosen:** Before any other check, walk up from `node.parentElement` and return `false` if any ancestor has `.talkient-processed`.

**Why:** The current check only tests the immediate parent (`parent.classList.contains('talkient-processed')`). If the text node is nested one level deeper inside the wrapper (e.g., inside the `<span>` child wrapping the text), the check misses it. An ancestry walk is O(depth) and depth is small.

**Alternative considered:** Keep existing check and fix only `removeTalkientUiElements()`. Rejected: defense-in-depth is warranted here since the bug causes visible, severe UI corruption.

### Decision 3: Add a `data-talkient-id` attribute to wrapper spans

**Chosen:** No — unnecessary complexity. The class-based check after the fix is sufficient and the DOM unwrap eliminates the re-processing window entirely.

## Risks / Trade-offs

- **Unwrap during active playback** → Mitigation: `removeTalkientUiElements()` is already called before re-processing; playback state is reset by `resetEstimateCounters()` and `clearHighlight()` at the same callsites. No additional handling needed.
- **Unwrap leaves stale click listeners** → Not a risk: listeners are attached to the button element which is removed before unwrapping.
- **Performance of ancestry walk in `shouldProcessNode()`** → Negligible; called only during initial scan and depth is bounded by typical DOM structure (< 20 levels).
