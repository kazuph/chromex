# Gemini In Chrome Gap Analysis

Date checked: April 22, 2026

Primary public sources:

- Google Chrome Help: [Use Gemini in Chrome](https://support.google.com/chrome/answer/16283624)
- Google Chrome Help: [Use Gemini Live with Gemini in Chrome](https://support.google.com/chrome/answer/16363185)
- Google Blog: [Chrome gets new Gemini 3 features, including auto browse](https://blog.google/products-and-platforms/products/chrome/gemini-3-auto-browse/)
- Google Blog: [Turn your best AI prompts into one-click tools in Chrome](https://blog.google/products-and-platforms/products/chrome/skills-in-chrome/)

## Feature Matrix

| Gemini in Chrome capability | Current Codex extension status | Notes |
| --- | --- | --- |
| Persistent side panel | Implemented | MV3 side panel shell is in place. |
| Current tab shared by default | Implemented | User can now toggle it off and persist the preference. |
| Share up to 10 open tabs | Implemented | Tabs are selectable across browser windows and capped at 10. |
| `@` tab insertion | Implemented | `@` suggestions exist for tab and context attachment. |
| New chat | Implemented | Background-managed conversation reset. |
| Recent chats | Implemented | Stored locally and resumable through Codex thread resume. |
| Pop-out and dock back | Implemented | Side panel can open in a popup and dock back to the browser window. |
| Model switching | Implemented | Lightweight model selector added. |
| Gemini Live style voice mode | Implemented | Uses Codex app-server realtime with WebRTC offer/SDP answer forwarding through the bridge. |
| Live captions | Implemented | Captions can be toggled in settings. |
| Voice reconnect | Implemented | Unexpected realtime drops trigger bounded automatic reconnect; explicit user stops and auth/permission failures do not loop. |
| Voice page navigation | Implemented approximately | Supports scroll, top/bottom, highlight/find, and the same constrained DOM action path used by text requests when the route planner resolves a page operation. |
| Image transforms on current page | Implemented | Uses Codex built-in image generation/editing through `codex app-server`; ChatGPT login is sufficient. |
| Skills via slash prompt | Implemented approximately | Saved slash skills and built-in shortcuts are supported. |
| Multi-step auto browse | Partial | A constrained DOM action planner can click, fill, select, scroll, focus, and submit visible elements on the active tab. It is not a general-purpose Playwright/Computer Use executor. |
| Connected Google apps | Not implemented | Requires Google app auth and service-specific APIs. |
| Personal Intelligence / photos and albums | Not implemented | Requires Google account-level integrations outside the current extension scope. |
| Workspace direct document access beyond DOM | Not implemented | Current implementation reads DOM and visible context, not privileged Workspace account content. |

## Improvements Added In This Pass

- resumable saved conversations
- popup and dock flows
- keyboard-command entry points
- persistent settings
- saved slash skills
- live captions
- voice selection
- voice page navigation commands
- bounded automatic reconnect for dropped Codex realtime voice sessions
- tab sharing across windows
- actual multimodal Codex image inputs from screenshot data URLs
- built-in Codex image editing with ChatGPT-authenticated sessions
- app-server plugin mentions from installed/enabled `plugin/list` results
- app-server-planned constrained DOM actions for active-page operation requests

## Remaining Hard Gaps

The main remaining differences are the ones that depend on external privileged integrations or a richer action runtime:

- Google Workspace / Gmail / Calendar / Photos / Maps connected apps
- unrestricted Playwright/Computer Use-style automation across browser and desktop state
