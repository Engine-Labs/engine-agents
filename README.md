**WARNING: This project currently in pre-release and is not suitable for production usage**

# Engine Agents

[![NPM version](https://img.shields.io/npm/v/engine-agents)](https://npmjs.org/package/openai/engine-agents)
[![](https://img.shields.io/discord/1113845829741056101?logo=discord&style=flat)](https://discord.gg/QnytC3Y7Wx)

A multi-agent LLM framework inspired by Microsoft's [autogen](https://github.com/microsoft/autogen),
designed to be friendlier to use behind APIs and written in TypeScript.

Want a hosted version of this? [Sign up for the waitlist here](https://share-eu1.hsforms.com/1s6stLQg1SqqSJzRjF-xOBg2b9ek1)
to access a hosted UI and API, coming in the next few days (as of 26th October 2023).

## Getting Started

```bash
npm install engine-agents
# or
yarn add engine-agents
```

You'll also need to make the environment variable OPENAI_API_KEY available wherever you're
using this library.

If you're working on this library, one way to do this is to copy [.env.example](./.env.example) to `.env`,
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
}

run();
```

See the [examples directory](./examples/) for more.

## Known issues

- Code execution: if enabled on an agent, it will attempt to execute any code it generates on the
  machine that it is running on - this code execution is currently **not sandboxed in any way** so
  use at your own risk!

- Code execution: this library has not been tested for compatibility on machines running Windows

- Code execution: single line code blocks will not be executed

- The max number of messages is currently capped at 10 and not yet configurable from outside the library

- The LLM used to create the completions is not yet configurable from outside the library

- Errors from the OpenAI API aren't handled gracefully or retried yet

- When defining function calls with FunctionConfig, function implementations must not
  be arrow functions because of how the config is serialized and deserialized

- The groupchat model sometimes doesn't mesh well with returning only the responses from the TeamLeader of a Team

## Roadmap

Coming soon

## Contributing

Contributions and suggestions are welcome!
