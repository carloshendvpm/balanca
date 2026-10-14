// expo-notifications always adds the push entitlement, which free Apple IDs
// cannot sign. The app only schedules local reminders, so drop it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
