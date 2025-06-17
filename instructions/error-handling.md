
# Error Handling & Reporting

## General Patterns
- **Try/Catch:** Wrap async operations; log context with module and action.
- **Error Boundaries:** In React, use for UI components to catch rendering errors.
- **User Feedback:** Display friendly messages; avoid leaking internals.

## Logging
- **Client:** `console.error('[RH][Module]', error, { context });`
- **Server:** Integrate with Sentry, include metadata (`userId`, `promptId`).

## AI Conversation Logging & Resilience
- **Prompt Tracking:** Assign each AI prompt a unique `promptId` and log the full prompt sent, along with timestamp and context tags (e.g. `feature:name`, `bugfix:order-form`).
- **Response Validation:** After receiving GPT output, automatically scan for required sections or keywords. If missing, flag as `incompleteResponse` and attach missing-fields in the log entry.
- **Error Handler:** On `incompleteResponse` or runtime errors in handling AI text, capture:
  - `promptId`
  - Original prompt
  - GPT reply
  - Detected missing elements
  - Client state snapshot (e.g. current component props)
- **Automated Retry:** For missing details, resend a refined prompt to GPT asking only for the omitted sections, appending `// NOTE: please include <missing_sections>`.
- **Audit Log:** Persist logs in a JSONL file (e.g. `logs/ai-conversations.log`) with entries:
  ```json
  {
    "timestamp": "2025-06-17T13:45:00Z",
    "promptId": "abc123",
    "type": "gpt_request",
    "content": "<full prompt text>",
    "contextTags": ["ui-update","client:OrderForm"]
  }
  ```
- **Visibility:** Surface recent AI errors in Slack #dev-updates with links to log entries and recommended retry actions.

## Try/Catch Patterns
- Wrap async code in `try/catch`; in React components use Error Boundaries.

```js
async function fetchData() {
  try {
    const res = await api.get('/orders');
    return res.data;
  } catch (error) {
    logError(error, { module: 'OrderService' });
    throw new Error('Failed to fetch orders');
  }
}
```

## User Feedback
- Show user‑friendly messages: `Something went wrong. Please try again later.`
- Avoid exposing raw error details in UI.
