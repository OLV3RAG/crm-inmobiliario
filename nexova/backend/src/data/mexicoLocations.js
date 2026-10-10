import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let catalog = null;

function loadCatalog() {
  if (!catalog) {
    const filePath = path.join(__dirname, 'estados-municipios.json');
    catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return catalog;
}

export function getMexicoStates() {
  return Object.keys(loadCatalog()).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getMunicipalitiesByState(state) {
  if (!state) return [];
  const list = loadCatalog()[state.trim()];
  if (!list) return [];
  return [...list].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getMexicoCatalog() {
  const c = loadCatalog();
  return getMexicoStates().map((name) => ({
    state: name,
    municipalities: [...c[name]].sort((a, b) => a.localeCompare(b, 'es')),
  }));
}

/** Quita acentos y normaliza para comparar nombres del Excel con el catálogo INEGI. */
export function normalizeLocationKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

const STATE_ALIASES = {
  'estado de mexico': 'México',
  edomex: 'México',
  'ciudad de mexico': 'Ciudad de México',
  cdmx: 'Ciudad de México',
  'distrito federal': 'Ciudad de México',
  veracruz: 'Veracruz de Ignacio de la Llave',
  queretaro: 'Querétaro',
  michoacan: 'Michoacán de Ocampo',
  'san luis potosi': 'San Luis Potosí',
  coahuila: 'Coahuila de Zaragoza',
  'nuevo leon': 'Nuevo León',
  yucatan: 'Yucatán',
  'baja california sur': 'Baja California Sur',
  'baja california': 'Baja California',
};

/** Ciudades o nombres comunes en Excel → municipio oficial INEGI. */
const MUNICIPALITY_ALIASES = {
  'cabo san lucas': { municipality: 'Los Cabos' },
  'heroica puebla de zaragoza': { municipality: 'Puebla' },
  'puebla de zaragoza': { municipality: 'Puebla' },
  'santiago de queretaro': { municipality: 'Querétaro' },
  'ciudad nezahualcoyotl': { municipality: 'Nezahualcóyotl' },
  'naucalpan de juarez': { municipality: 'Naucalpan de Juárez' },
  'heroica matamoros': { municipality: 'Matamoros' },
  'ciudad madero': { municipality: 'Ciudad Madero' },
  'los mochis': { municipality: 'Ahome' },
  'boca del rio': { municipality: 'Boca del Río' },
  'san jose del cabo': { municipality: 'Los Cabos' },
  'san francisco coacalco': { municipality: 'Coacalco de Berriozábal' },
  'coacalco': { municipality: 'Coacalco de Berriozábal' },
  'tlanepantla de baz': { municipality: 'Tlalnepantla de Baz' },
  'tlalnepantla': { municipality: 'Tlalnepantla de Baz' },
  'ciudad guzman': { municipality: 'Zapotlán el Grande' },
  'villahermosa': { municipality: 'Centro' },
  'cuahuutemoc': { municipality: 'Cuauhtémoc' },
  'cuauhtemoc': { municipality: 'Cuauhtémoc' },
  'chetumal': { municipality: 'Othón P. Blanco' },
  'ciudad obregon': { municipality: 'Cajeme' },
  'juriquilla': { municipality: 'Querétaro' },
  'el pueblito': { municipality: 'Corregidora' },
  'ciudad lopez mateos': { municipality: 'Atizapán de Zaragoza' },
  'crucecita': { municipality: 'Santa María Huatulco' },
};

export function resolveMexicoState(input) {
  if (!input?.trim()) return null;
  const key = normalizeLocationKey(input);
  const alias = STATE_ALIASES[key];
  if (alias && loadCatalog()[alias]) return alias;

  const states = getMexicoStates();
  const found = states.find((s) => normalizeLocationKey(s) === key);
  return found || null;
}

export function resolveMexicoMunicipality(stateName, input) {
  if (!stateName || !input?.trim()) return null;

  const muns = getMunicipalitiesByState(stateName);
  if (!muns.length) return null;

  const key = normalizeLocationKey(input);

  const alias = MUNICIPALITY_ALIASES[key];
  if (alias?.municipality && muns.includes(alias.municipality)) {
    return alias.municipality;
  }

  const exact = muns.find((m) => normalizeLocationKey(m) === key);
  if (exact) return exact;

  const tokens = key.split(' ').filter((t) => t.length > 3);
  const byToken = muns.find((m) => {
    const mk = normalizeLocationKey(m);
    return tokens.some((t) => mk.includes(t));
  });
  if (byToken) return byToken;

  const partial = muns.find((m) => {
    const mk = normalizeLocationKey(m);
    return mk.includes(key) || key.includes(mk);
  });
  if (partial) return partial;

  return null;
}

export function resolveMexicoLocation(stateInput, municipalityInput) {
  const state = resolveMexicoState(stateInput);
  if (!state) {
    return { state: null, municipality: null, warnings: [`estado no reconocido: "${stateInput}"`] };
  }

  const municipality = resolveMexicoMunicipality(state, municipalityInput);
  const warnings = [];
  if (!municipality) {
    warnings.push(`municipio no reconocido: "${municipalityInput}" en ${state}`);
  }

  return { state, municipality, warnings };
}

export function isValidStateAndMunicipality(state, municipality) {
  if (!state?.trim() || !municipality?.trim()) return false;
  return getMunicipalitiesByState(state).includes(municipality.trim());
}
