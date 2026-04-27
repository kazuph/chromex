# Chrome Web Store Listing Draft

This document is written for an English-first Chrome Web Store launch. Replace the clearly marked `TODO` fields with the final public URLs before submission.

Official submission references:

- Chrome Web Store image assets: <https://developer.chrome.com/docs/webstore/images/>
- Chrome Web Store listing dashboard: <https://developer.chrome.com/docs/webstore/cws-dashboard-listing/>
- Chrome Web Store privacy practices: <https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/>
- Chrome Web Store user data policy: <https://developer.chrome.com/docs/webstore/user_data>

## Store Listing

Product name:

```text
Chromex
```

One-line summary:

```text
Codex-powered browser assistant for page context, tabs, voice, files, and image workflows.
```

Category:

```text
Productivity
```

Language:

```text
English (United States)
```

Regions:

```text
United States, United Kingdom, Canada, Australia, New Zealand, and other English-speaking regions first. Expand to all regions after support and privacy policy localization are ready.
```

Detailed description:

```text
Chromex brings a Codex-powered assistant into Chrome's side panel so you can work with the page you are already viewing.

Use it to summarize webpages, compare selected tabs, ask questions about page content, draft replies, turn YouTube videos into timestamped notes, attach files, dictate prompts, and edit or generate images from page context or uploaded references.

Key capabilities:

• Page-aware chat: ask about the current page, selected tabs, uploaded files, screenshots, and images without switching apps.
• Hybrid context reading: Chromex can use page text, selected DOM content, visible-screen context, or supported site adapters depending on the task.
• YouTube and web workflows: summarize videos, explain the current moment, extract chapter notes, and jump to timestamps when available.
• Image workflows: edit images from the page, upload reference images, create infographics, and open generated assets from the local output folder.
• Voice and dictation: dictate into the chat box or start a live voice session when your local Codex runtime supports it.
• Profiles and skills: choose reusable instruction profiles for research, marketing, product work, support, fact-checking, slide planning, and more.
• Local bridge architecture: authentication, Codex app-server communication, temporary files, generated images, and diagnostics are handled by the local native bridge rather than by extension storage.

Chromex is designed for user-controlled workflows. Browser history, microphone access, host permissions, tab context, screenshots, and page actions are requested only for the feature being used. The extension does not sell data, does not run third-party ad tracking, and does not store raw OpenAI API keys in Chrome extension storage.

Requirements:

• Chrome 116 or later.
• The Chromex local native bridge installed on the same computer.
• A supported Codex/OpenAI account or API-key fallback configured through the local bridge.

Chromex is open source and built for users who want a practical browser assistant with transparent permissions and local-first runtime boundaries.
```

What's new:

```text
Initial public release of Chromex: side-panel chat, current-page context, multi-tab selection, YouTube-aware suggestions, file and image attachments, image generation/editing workflows, voice/dictation entry points, profile templates, and local Codex bridge integration.
```

Support URL:

```text
TODO: https://github.com/<owner>/<repo>/issues
```

Homepage URL:

```text
TODO: https://github.com/<owner>/<repo>
```

Privacy Policy URL:

```text
TODO: https://<public-site>/privacy
```

## Store Assets

Generated assets are in:

```text
output/chrome-web-store-assets/
```

Upload these assets:

```text
Icon: output/chrome-web-store-assets/icon-128.png
Screenshot 1: output/chrome-web-store-assets/screenshot-1-browser-assistant-1280x800.png
Screenshot 2: output/chrome-web-store-assets/screenshot-2-youtube-context-1280x800.png
Screenshot 3: output/chrome-web-store-assets/screenshot-3-image-editing-1280x800.png
Screenshot 4: output/chrome-web-store-assets/screenshot-4-local-bridge-privacy-1280x800.png
Screenshot 5: output/chrome-web-store-assets/screenshot-5-voice-and-files-1280x800.png
Small promotional tile: output/chrome-web-store-assets/small-promo-440x280.png
Marquee promotional tile: output/chrome-web-store-assets/marquee-promo-1400x560.png
```

Regenerate:

```bash
npm run store:assets
```

The screenshots use synthetic public-safe example pages instead of real personal tabs. This avoids leaking account names, browsing history, private repositories, email content, or other personal data into the public store listing.

## Single Purpose

```text
Chromex provides a Chrome side-panel AI assistant that helps users understand and work with webpages, selected tabs, uploaded files, voice input, images, and browser workflows through a local Codex bridge.
```

## Permission Justifications

`sidePanel`

```text
Displays the main Chromex assistant interface in Chrome's side panel.
```

`activeTab`

```text
Lets Chromex use the current tab only after the user opens the extension or invokes a page action. This supports current-page summaries, selected-page context, and image workflows without requiring broad site access at install time.
```

`scripting`

```text
Injects the content script needed to extract selected page text, readable DOM content, visible page image metadata, and user-approved page interaction helpers.
```

`storage`

```text
Stores local extension preferences such as theme, language, selected model, profile templates, enabled skills, onboarding state, and lightweight conversation metadata. Large generated image assets are kept by the local bridge instead of Chrome extension storage.
```

`contextMenus`

```text
Adds user-triggered right-click actions such as asking about the current page, editing an image, or summarizing a YouTube video.
```

`nativeMessaging`

```text
Connects the extension to the local Chromex native bridge. The bridge owns Codex app-server communication, authentication handoff, image files, diagnostics, and runtime-heavy operations.
```

Optional `history`

```text
Used only when the user asks Chromex to search or reason over browser history, such as "where did I read this yesterday?" The permission is requested on demand.
```

Optional `tabs`

```text
Used to list open tabs for explicit user selection and multi-tab comparison. Chromex does not attach all tabs automatically.
```

Optional host permissions, including `<all_urls>`

```text
Requested only when a user asks Chromex to read, summarize, capture, or act on a specific site. Host access enables DOM extraction, visible screen capture, image detection, supported site adapters, and user-approved browser actions.
```

## Privacy Practices

Recommended Chrome Web Store disclosure:

```text
Chromex processes user-selected browser context to provide assistant features. Depending on the user's action, this may include current page text, selected text, tab titles and URLs, uploaded files, images, screenshots, voice audio for dictation/live mode, generated image metadata, and optional browser history search results.

Chromex does not sell user data and does not use data for advertising. The extension does not store raw OpenAI API keys or OAuth tokens in Chrome extension storage. Authentication and Codex app-server communication are handled by the local native bridge installed by the user.

Page content, files, images, screenshots, voice audio, and history snippets are sent only when needed for the user-requested feature and may be processed by the user's configured Codex/OpenAI service through the local bridge. Generated images and temporary files are stored locally by the bridge and can be opened or removed by the user.
```

Data categories to disclose if the dashboard asks:

```text
Website content: yes, only when the user asks for page-aware answers or actions.
Browsing history: yes, only when the user invokes history-based questions and grants permission.
User activity: yes, limited to user-requested browser actions and interaction state needed to complete the task.
Audio: yes, only for voice input/live voice features.
Files and images: yes, only when uploaded by the user or selected from the page for image/file workflows.
Authentication information: handled by the local native bridge; the extension does not store raw API keys or OAuth tokens in Chrome extension storage.
Personal communications: possible only when the current page is a communication tool and the user asks Chromex to process that page.
```

Data-use confirmations:

```text
Data is not sold to third parties.
Data is not used for creditworthiness or lending.
Data is not used for unrelated advertising.
Data is used only to provide user-requested assistant features.
Data access is limited to the feature and permission granted by the user.
```

Remote code disclosure:

```text
Chromex does not execute remotely hosted JavaScript in the extension. Extension code is packaged with MV3. Model responses are treated as data and are not executed as extension code.
```

## Review Notes

Before submitting:

```text
1. Replace TODO support, homepage, and privacy policy URLs.
2. Run npm run package:webstore and upload the generated Chrome Web Store ZIP.
3. Confirm the packaged manifest does not include a key field.
4. Upload the assets from output/chrome-web-store-assets/.
5. Confirm the privacy dashboard disclosures match the current feature set.
6. Confirm the native bridge installation instructions are public and match macOS, Windows, and Linux paths.
7. Verify no screenshot contains real account names, private tabs, emails, history, API keys, local paths, or private repository content.
```
