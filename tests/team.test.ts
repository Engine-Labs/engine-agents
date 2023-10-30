import nock from "nock";

import { TeamLeader } from "../src/teamMembers";
import { Team } from "../src/team";

import * as fs from "fs";
import { decompressCassettes } from "./utils";

describe("Team class", () => {
  afterAll(async () => {
    const chat = nock.recorder.play();
    fs.writeFileSync(__dirname + "/cassettes/chat.json", JSON.stringify(chat));
    await decompressCassettes(__dirname + "/cassettes");
  });

  it("should be tested", async () => {
    const assistant = new TeamLeader(
      "Helpful Assistant",
      "You are a helpful assistant."
    );

    const team = new Team(assistant);

    nock.recorder.rec({ output_objects: true, dont_print: true });
    await team.chat("What does the @ sign in some NPM packages mean?");
  });
});
