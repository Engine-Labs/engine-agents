**WARNING: This project currently in pre-release and is not suitable for production usage**

# Engine Agents

[![NPM version](https://img.shields.io/npm/v/engine-agents)](https://npmjs.org/package/openai/engine-agents)

A multi-agent LLM framework inspired by Microsoft's [autogen](https://github.com/microsoft/autogen),
designed to be friendlier to use behind APIs and written in TypeScript.

## Getting Started

```bash
npm install engine-agents
# or
yarn add engine-agents
```

You'll also need to make the environment variable OPENAI_API_KEY available wherever you're
using this library. One way to do this is to copy [.env.example](./.env.example) to `.env`,
fill in your API key, and use `dotenv` as shown [below](#usage) and in the [examples](./examples/).

## Usage

```typescript
import * as dotenv from "dotenv";
dotenv.config();

import { TeamLeader, Team } from "engine-agents";

async function run() {
  const assistant = new TeamLeader(
    "Helpful Assistant",
    "You are a helpful assistant."
  );

  const team = new Team(assistant);

  const chat = await team.chat(
    "What does the @ sign in some NPM packages mean?"
  );
  console.log(chat);

  const teamState = team.getState();
  console.log(teamState);
}

run();
```

See the [examples directory](./examples/) for more.

## Known issues

## Roadmap

## Contributing
