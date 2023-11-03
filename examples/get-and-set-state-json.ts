import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";

async function run() {
  const assistant = new TeamLeader(
    "State Manager",
    `Given a UUID, you can create, read, update, and delete blobs associated with that UUID in the global state.
When creating or updating blobs, you must provide a JSON-serializable object.`,
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      read_json_blob: {
        schema: {
          name: "read_json_blob",
          description: "Retrieve JSON blob associated with a UUID",
          parameters: {
            type: "object",
            required: ["uuid"],
            properties: {
              uuid: {
                type: "string",
              },
            },
          },
        },
        function: async function read_json_blob(args: { uuid: string }) {
          const stateFile = `${__dirname}/state.json`;
          const fs = require("fs");
          if (!fs.existsSync(stateFile)) {
            fs.writeFileSync(stateFile, "{}");
          }
          const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
          if (state[args.uuid]) {
            return JSON.stringify(state[args.uuid]);
          }
          return "No JSON blob found.";
        },
      },
      create_new_json_blob_for_uuid: {
        schema: {
          name: "create_new_json_blob_for_uuid",
          description:
            "Insert JSON blob into the global state and associate it with a UUID.",
          parameters: {
            type: "object",
            required: ["json_blob", "uuid"],
            properties: {
              json_blob: {
                type: "object",
                description: "JSON blob to store.",
              },
              uuid: {
                type: "string",
              },
            },
          },
        },
        function: async function create_new_json_blob_for_uuid(args: {
          uuid: string;
          json_blob: any;
        }) {
          if (!args.json_blob) {
            return "No json_blob provided.";
          }

          const stateFile = `${__dirname}/state.json`;
          const fs = require("fs");
          if (!fs.existsSync(stateFile)) {
            fs.writeFileSync(stateFile, "{}");
          }

          const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
          const existingBlob = state[args.uuid] || {};

          Object.keys(args.json_blob).forEach((key) => {
            existingBlob[key] = args.json_blob[key];
          });

          state[args.uuid] = existingBlob;
          fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
          return `Created JSON blob for ${args.uuid}`;
        },
      },
      update_existing_json_blob: {
        schema: {
          name: "update_existing_json_blob",
          description: "Update JSON blob associated with a UUID.",
          parameters: {
            type: "object",
            required: ["json_blob", "uuid"],
            properties: {
              json_blob: {
                type: "object",
                description: "JSON blob to update the existing blob with.",
              },
              uuid: {
                type: "string",
              },
            },
          },
        },
        function: async function update_existing_json_blob(args: {
          uuid: string;
          json_blob: any;
        }) {
          if (!args.json_blob) {
            return "No json_blob provided.";
          }

          const stateFile = `${__dirname}/state.json`;
          const fs = require("fs");
          if (!fs.existsSync(stateFile)) {
            fs.writeFileSync(stateFile, "{}");
          }

          const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
          const existingBlob = state[args.uuid] || {};

          Object.keys(args.json_blob).forEach((key) => {
            existingBlob[key] = args.json_blob[key];
          });

          state[args.uuid] = existingBlob;
          fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
          return `Updated JSON blob for ${args.uuid}`;
        },
      },
      delete_json_blob: {
        schema: {
          name: "delete_json_blob",
          description: "Delete the JSON blob associated with a UUID.",
          parameters: {
            type: "object",
            required: ["uuid"],
            properties: {
              uuid: {
                type: "string",
              },
            },
          },
        },
        function: async function delete_json_blob(args: { uuid: string }) {
          const stateFile = `${__dirname}/state.json`;
          const fs = require("fs");
          if (!fs.existsSync(stateFile)) {
            fs.writeFileSync(stateFile, "{}");
          }
          const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
          if (state[args.uuid]) {
            delete state[args.uuid];
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
            return `Deleted blob for ${args.uuid}`;
          }
          return "No blob found.";
        },
      },
    }
  );

  async function handleTeamStateUpdate(teamState: any) {
    // console.log(JSON.stringify(teamState, null, 2));
  }

  const team = new Team(assistant, [], handleTeamStateUpdate);

  const teamState = team.getState();
  const restoredTeam = Team.fromState(teamState);

  // const chat = await restoredTeam.chat(
  //   "Could you store the email address contact@example.com at UUID bbaa7261-ea1c-427c-b5b5-48b284b3ab48?"
  // );
  // const chat = await restoredTeam.chat(
  //   "Could you store the name John Doe at UUID bbaa7261-ea1c-427c-b5b5-48b284b3ab48?"
  //   );
  // const chat = await restoredTeam.chat(
  //   "Please fetch the data for UUID bbaa7261-ea1c-427c-b5b5-48b284b3ab48"
  // );
  const chat = await restoredTeam.chat(
    "Please delete the data for UUID bbaa7261-ea1c-427c-b5b5-48b284b3ab48"
  );

  console.log(chat);
}

run();
