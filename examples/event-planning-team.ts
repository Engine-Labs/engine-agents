import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";
import { TeamMember } from "../src/teamMember";

async function memberLevelPersistenceExample() {
  const coordinator = new TeamLeader(
    "Event Coordinator",
    `You oversee the event planning process.
Please try to solve any issues that arise during the planning process.`
  );

  const logistics = new TeamMember(
    "Logistics Manager",
    `You are responsible for the logistics of the event, like the venue and transportation.
Ensure that your planning meets the event specifications.
As tasks arise, add them to be the checklist to be completed
You can mark a task as completed if the user has told you it has been done.`,
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      add_tasks: {
        schema: {
          name: "add_tasks",
          description: "Add tasks to the checklist",
          parameters: {
            type: "object",
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
          },
        },
        function: async function add_tasks(args: { tasks: string[] }) {
          const tasksFile = `${__dirname}/tasks.json`;
          const fs = require("fs");
          if (!fs.existsSync(tasksFile)) {
            fs.writeFileSync(tasksFile, "{}");
          }
          const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf8"));

          const formattedTasks = args.tasks.map((task) => ({
            name: task,
            type: "logistics",
            completed: false,
          }));

          tasks.push(...formattedTasks);
          fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
          return `Added tasks to checklist.`;
        },
      },
      mark_task_as_completed: {
        schema: {
          name: "mark_task_as_completed",
          description: "Mark task as completed",
          parameters: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
              },
            },
          },
        },
        function: async function mark_task_as_completed(args: {
          name: string;
        }) {
          const tasksFile = `${__dirname}/tasks.json`;
          const fs = require("fs");
          if (!fs.existsSync(tasksFile)) {
            fs.writeFileSync(tasksFile, "{}");
          }
          const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf8"));

          const task = tasks.find((task: any) => task.name === args.name);
          task.completed = true;

          fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
          return `Marked task as completed.`;
        },
      },
      get_available_venues: {
        schema: {
          name: "get_available_venues",
          description: "Get available venues",
          parameters: {
            type: "object",
            required: ["date"],
            properties: {
              date: {
                type: "string",
              },
            },
          },
        },
        function: async function get_available_venues(args: { date: string }) {
          return `Available venues for ${args.date}: 1. The Ritz-Carlton, 2. The Four Seasons, 3. The W Hotel`;
        },
      },
      get_transportation_options: {
        schema: {
          name: "get_transportation_options",
          description: "Get transportation options",
          parameters: {
            type: "object",
            required: ["date"],
            properties: {
              date: {
                type: "string",
              },
            },
          },
        },
        function: async function get_transportation_options(args: {
          date: string;
        }) {
          return `Transportation options for ${args.date}: 1. Uber, 2. Lyft, 3. Taxi`;
        },
      },
    }
  );

  const pr = new TeamMember(
    "PR Manager",
    `You are responsible for managing the guest list, and keeping track of invitations and RSVPs.
Please update and manage the guest list as required.`,
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      add_invitations_to_checklist: {
        schema: {
          name: "add_invitations_to_checklist",
          description: "Add invitations to the checklist",
          parameters: {
            type: "object",
            required: ["names"],
            properties: {
              names: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
          },
        },
        function: async function add_invitations_to_checklist(args: {
          invitations: string[];
        }) {
          const tasksFile = `${__dirname}/tasks.json`;
          const fs = require("fs");
          if (!fs.existsSync(tasksFile)) {
            fs.writeFileSync(tasksFile, "[]");
          }
          const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf8"));

          const formattedTasks = args.invitations.map((invitation) => ({
            name: invitation,
            type: "invitation",
            sent: false,
            rsvp: false,
          }));

          tasks.push(...formattedTasks);
          fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
          return `Added invitations to checklist.`;
        },
      },
      mark_invitation_as_sent: {
        schema: {
          name: "mark_invitation_as_sent",
          description: "Mark invitation as sent",
          parameters: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
              },
            },
          },
        },
        function: async function mark_invitation_as_sent(args: {
          name: string;
        }) {
          const tasksFile = `${__dirname}/tasks.json`;
          const fs = require("fs");
          if (!fs.existsSync(tasksFile)) {
            fs.writeFileSync(tasksFile, "[]");
          }
          const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf8"));

          const task = tasks.find((task: any) => task.name === args.name);
          task.sent = true;

          fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
          return `Marked invitation as sent.`;
        },
      },
      get_guest_list: {
        schema: {
          name: "get_guest_list",
          description: "Get guest list",
          parameters: {
            type: "object",
            required: ["date"],
            properties: {
              date: {
                type: "string",
              },
            },
          },
        },
        function: async function get_rsvps(args: { date: string }) {
          const tasksFile = `${__dirname}/tasks.json`;
          const fs = require("fs");
          if (!fs.existsSync(tasksFile)) {
            fs.writeFileSync(tasksFile, "{}");
          }
          const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf8"));

          const guestList = tasks.filter(
            (task: any) => task.type === "invitation"
          );

          const rsvps = guestList.filter((task: any) => task.rsvp);

          return `Current guest list for ${args.date}: ${rsvps.map(
            (rsvp: any) => rsvp.name
          )}`;
        },
      },
    }
  );

  const team = new Team(coordinator, [logistics, pr]);
  const chat = await team.chat(`I'd like to plan an event please`);

  // Comment out the 2 lines above and uncomment the lines below to be able to carry on the chat

  // const teamState = JSON.parse(
  //   fs.readFileSync(`${__dirname}/teamState.json`, "utf8")
  // );
  // const team = Team.fromState(teamState);
  // const chat = await team.chat(`<INSERT FOLLOW UP MESSAGE HERE`)

  console.log(chat);

  const teamStateAfterChat = team.getState();
  fs.writeFileSync(
    `${__dirname}/teamState.json`,
    JSON.stringify(teamStateAfterChat, null, 2)
  );
}

memberLevelPersistenceExample();
