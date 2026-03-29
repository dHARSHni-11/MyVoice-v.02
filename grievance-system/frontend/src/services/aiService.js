import { aiAPI } from './api';

export const getSuggestion = async (grievance) => {
  const res = await aiAPI.suggest(grievance);
  return res.data.response;
};

export const classifyText = async (description) => {
  const res = await aiAPI.classify(description);
  return res.data;
};
