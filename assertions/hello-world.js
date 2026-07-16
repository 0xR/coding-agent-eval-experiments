// Promptfoo custom assertion. `output` is the working-directory path returned by
// the agent provider (providers/agent.js). Delegates to the tested grader in
// src/grader.js, which enforces the strict contract:
//   package.json + a .js file + a defined start script, and `npm start` must
//   print "hello world" and exit 0 within the timeout.

const { gradeProject } = require('../src/grader');

module.exports = async (output) => {
  if (!output || typeof output !== 'string') {
    return { pass: false, score: 0, reason: 'provider returned no working directory' };
  }
  return gradeProject(output);
};
