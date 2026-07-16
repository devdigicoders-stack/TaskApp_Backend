const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

// Helper: get a setting by key
Settings.get = async (key, defaultValue = null) => {
  const doc = await Settings.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper: set a setting
Settings.set = async (key, value, description = '') => {
  return Settings.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true }
  );
};

module.exports = Settings;
