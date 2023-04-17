# SMO Quiz

This is a node.js webapp that quizzes the user on Mario Odyssey trivia. Play at https://smo-quiz.herokuapp.com.

## Implementation

Full-stack Node.js webapp. Backend uses Redis for state management; Express for routing and JSON REST API; cookie-signature with hand-written, secure session management; Google Sheets API to fetch trivia. Written in TypeScript.

Frontend is a SPA written in JavaScript with no framework. Native browser DOM manipulation with fetch APIs to the backend.

## Development

Requires Redis to be running on the local machine. Also connects to my Google Sheet of questions and answers. Note: This is a private Google Sheet and only I have access. Contains a .env file with the following contents:

```
COOKIE_SECRET=
REDISCLOUD_URL=redis://localhost
GOOGLE_API_KEY=
```
