// Production PM2 entrypoint delegates to the deploy-safe config.
module.exports = require("./deploy/config/pm2/ecosystem.config.js");
