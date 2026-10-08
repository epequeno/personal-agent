goal: 
	create a local, personal agent to help with on-going or persitent tasks and activities

design:
	This should mostly be a customized instance of the pi coding agent whose configurations and associated code and data are stored here: /Users/steven/code/personal-agent

requirements
	- data is stored locally (avoid cloud/remote storage)
	- the code/config should be shareable (via github) but private data should not be committed or pushed

notes:
	- this is partly pedagogical and demo project but I want to "dogfood" this and use this agent as my primary agent interaction for my "main" projects

	- We should look to openclaw, hermes, and other existing agent harnesses for inspiration but the goal is not to re-implement them, this should be custom software for my use cases not targeting a larger market of users

- main directories in consideration
	These directories already contain the files, plans, code, etc for existing projects. The primary use case for the agent is to ask like a project manager / personal assistant 

	- /Users/steven/Dropbox/eapsoftware-research
	- /Users/steven/code
	- /Users/steven/Dropbox/obsidian/Personal

## Where things are

	docs/DESIGN.md   the design as it stands (what)
	adr/             decision log, one decision per file (why)
	ROADMAP.md       milestones M0–M5

	agent/                   the pi agent directory (committed, shareable)
	bin/pa                   launcher; wires the agent dir to the data dir
	~/personal-agent-data/   private state — sessions, memory, atlas, journal
	                          never committed, outside this repo by design

Design phase is complete. Implementation starts at M0 — see ROADMAP.md.
