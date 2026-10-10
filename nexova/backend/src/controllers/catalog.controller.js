import { getMexicoCatalog, getMexicoStates, getMunicipalitiesByState } from '../data/mexicoLocations.js';

export function listMexicoLocations(req, res) {
  const { state } = req.query;
  if (state) {
    return res.json({ data: getMunicipalitiesByState(state) });
  }
  if (req.query.full === '1') {
    return res.json({ data: getMexicoCatalog() });
  }
  return res.json({ data: getMexicoStates() });
}
